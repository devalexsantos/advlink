// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock, generateFaqsMock } = vi.hoisted(() => ({
  prismaMock: { activityAreas: { findUnique: vi.fn() } },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
  generateFaqsMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
vi.mock("@/lib/openai", () => ({ generateAreaFaqs: generateFaqsMock }))

import { POST } from "@/app/api/activity-areas/generate-faq/route"
import { resetRateLimiters } from "@/lib/rate-limit"

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/activity-areas/generate-faq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

const faqs = [{ question: "O que é inventário?", answer: "É o procedimento de partilha de bens." }]

describe("POST /api/activity-areas/generate-faq", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
    vi.stubEnv("OPENAI_API_KEY", "sk-test")
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.activityAreas.findUnique.mockResolvedValue({ profileId: "profile-1", title: "Sucessões" })
    generateFaqsMock.mockResolvedValue(faqs)
  })
  afterEach(() => vi.unstubAllEnvs())

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await post({ areaId: "a1" })).status).toBe(401)
    expect(generateFaqsMock).not.toHaveBeenCalled()
  })

  it("returns 404 without an active site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await post({ areaId: "a1" })).status).toBe(404)
  })

  it("returns 400 without areaId", async () => {
    expect((await post({})).status).toBe(400)
    expect(generateFaqsMock).not.toHaveBeenCalled()
  })

  it("returns 404 for a missing area", async () => {
    prismaMock.activityAreas.findUnique.mockResolvedValue(null)
    expect((await post({ areaId: "x" })).status).toBe(404)
  })

  it("returns 403 for an area of another site", async () => {
    prismaMock.activityAreas.findUnique.mockResolvedValue({ profileId: "profile-2", title: "Penal" })
    expect((await post({ areaId: "a-other" })).status).toBe(403)
    expect(generateFaqsMock).not.toHaveBeenCalled()
  })

  it("returns 503 without OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    expect((await post({ areaId: "a1" })).status).toBe(503)
    expect(generateFaqsMock).not.toHaveBeenCalled()
  })

  it("returns the generated faqs for the area title without saving", async () => {
    const res = await post({ areaId: "a1" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ faqs })
    expect(generateFaqsMock).toHaveBeenCalledWith("Sucessões", "sk-test")
    expect(prismaMock.activityAreas.findUnique).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { profileId: true, title: true },
    })
  })

  it("returns 502 with a generic message when OpenAI fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    generateFaqsMock.mockRejectedValue(new Error("OpenAI error: 500 secret details"))
    const res = await post({ areaId: "a1" })
    expect(res.status).toBe(502)
    expect((await res.json()).error).not.toContain("secret")
  })

  it("returns 429 after 30 generations per user per hour", async () => {
    for (let i = 0; i < 30; i++) expect((await post({ areaId: "a1" })).status).toBe(200)
    const res = await post({ areaId: "a1" })
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect(generateFaqsMock).toHaveBeenCalledTimes(30)
  })
})
