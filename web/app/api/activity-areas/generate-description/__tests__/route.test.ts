// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getServerSessionMock, generateMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  generateMock: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/openai", () => ({ generateActivityDescriptions: generateMock }))

import { POST } from "@/app/api/activity-areas/generate-description/route"
import { resetRateLimiters } from "@/lib/rate-limit"

function genReq(title: string) {
  return new Request("http://localhost/api/activity-areas/generate-description", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

describe("POST /api/activity-areas/generate-description", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Civil" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing title", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns generated description", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    generateMock.mockResolvedValue(["Descrição de Direito Civil"])
    const req = new Request("http://localhost/api/activity-areas/generate-description", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Direito Civil" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.description).toBe("Descrição de Direito Civil")
  })

  it("returns 400 for a title longer than 120 characters without calling OpenAI", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    const res = await POST(genReq("x".repeat(121)))
    expect(res.status).toBe(400)
    expect(generateMock).not.toHaveBeenCalled()
  })

  it("returns 429 with Retry-After after 30 generations per user per hour", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    generateMock.mockResolvedValue(["desc"])
    for (let i = 0; i < 30; i++) {
      expect((await POST(genReq("Direito Civil"))).status).toBe(200)
    }
    const res = await POST(genReq("Direito Civil"))
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect((await res.json()).error).toMatch(/Limite de gerações/)
    expect(generateMock).toHaveBeenCalledTimes(30)

    // Another user is unaffected.
    getServerSessionMock.mockResolvedValue({ user: { id: "u2" } })
    expect((await POST(genReq("Direito Civil"))).status).toBe(200)
  })
})
