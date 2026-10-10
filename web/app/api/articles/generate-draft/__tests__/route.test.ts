// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { getServerSessionMock, generateArticleDraftMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  generateArticleDraftMock: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/openai", () => ({ generateArticleDraft: generateArticleDraftMock }))

import { POST } from "@/app/api/articles/generate-draft/route"
import { resetRateLimiters } from "@/lib/rate-limit"

const req = (body: unknown) =>
  new Request("http://localhost/api/articles/generate-draft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimiters()
  vi.stubEnv("OPENAI_API_KEY", "sk-test")
  getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  generateArticleDraftMock.mockResolvedValue({ content: "## Tema\n\nTexto.", excerpt: "Resumo." })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/articles/generate-draft", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await POST(req({ title: "Guarda compartilhada" }))).status).toBe(401)
  })

  it.each([[{}], [{ title: "ab" }], [{ title: "a".repeat(151) }], [{ title: "Guarda", notes: "a".repeat(2001) }]])(
    "returns 400 for %j",
    async (body) => {
      expect((await POST(req(body))).status).toBe(400)
      expect(generateArticleDraftMock).not.toHaveBeenCalled()
    },
  )

  it("returns 503 without OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    expect((await POST(req({ title: "Guarda compartilhada" }))).status).toBe(503)
  })

  it("returns the draft", async () => {
    const res = await POST(req({ title: " Guarda compartilhada ", notes: "diferenças" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ content: "## Tema\n\nTexto.", excerpt: "Resumo." })
    expect(generateArticleDraftMock).toHaveBeenCalledWith("Guarda compartilhada", "diferenças", "sk-test")
  })

  it("returns a generic 502 when generation fails", async () => {
    generateArticleDraftMock.mockRejectedValue(new Error("OpenAI error: 500 secret detail"))
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const res = await POST(req({ title: "Guarda compartilhada" }))
    expect(res.status).toBe(502)
    expect(JSON.stringify(await res.json())).not.toContain("secret")
    errSpy.mockRestore()
  })

  it("rate limits per user", async () => {
    for (let i = 0; i < 30; i++) await POST(req({ title: "Guarda compartilhada" }))
    expect((await POST(req({ title: "Guarda compartilhada" }))).status).toBe(429)
  })
})
