// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { jpegFile, spoofedHtmlFile } from "@/test/fixtures/images"

const { prismaMock, getServerSessionMock, uploadToS3Mock, generateMock, trackEventMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    profile: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    activityAreas: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/avatar.jpg" }),
  generateMock: vi.fn().mockResolvedValue(["Desc 1"]),
  trackEventMock: vi.fn().mockResolvedValue({}),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/openai", () => ({ generateActivityDescriptions: generateMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("@/lib/reserved-slugs", async (importOriginal) => importOriginal())
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

const { attributionMock } = vi.hoisted(() => ({ attributionMock: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/attribution-server", () => ({ getRequestAttribution: attributionMock }))

import { POST } from "@/app/api/onboarding/profile/route"
import { resetRateLimiters } from "@/lib/rate-limit"

function jsonReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/onboarding/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const session = { user: { id: "user-1" } }

describe("POST /api/onboarding/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" })
    prismaMock.profile.findFirst.mockResolvedValue(null)
    prismaMock.profile.update.mockResolvedValue({})
    prismaMock.activityAreas.deleteMany.mockResolvedValue({})
    prismaMock.activityAreas.createMany.mockResolvedValue({})
    prismaMock.user.update.mockResolvedValue({})
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("updates profile with slug", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "João Silva",
        areas: ["Civil"],
        email: "joao@test.com",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalled()
    const updateArg = prismaMock.profile.update.mock.calls[0][0]
    expect(updateArg.data.slug).toContain("joao-silva")
  })

  it("generates AI descriptions for areas", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Test",
        areas: ["Civil", "Penal"],
        email: "test@test.com",
      }),
    })
    await POST(req)
    expect(generateMock).toHaveBeenCalledWith(["Civil", "Penal"], expect.any(String))
  })

  it("completes onboarding when OpenAI fails, saving areas without description", async () => {
    generateMock.mockRejectedValueOnce(new Error("429 Too Many Requests"))
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", areas: ["Civil", "Penal"], email: "test@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = prismaMock.activityAreas.createMany.mock.calls[0][0].data
    expect(data).toHaveLength(2)
    expect(data.every((a: { description: string | null }) => a.description === null)).toBe(true)
    expect(prismaMock.profile.update.mock.calls[0][0].data.setupComplete).toBe(true)
    errSpy.mockRestore()
  })

  it("persists calendlyUrl", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "t@t.com", calendlyUrl: "https://calendly.com/joao" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update.mock.calls[0][0].data.calendlyUrl).toBe("https://calendly.com/joao")
  })

  it("returns 400 for an invalid calendlyUrl", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "t@t.com", calendlyUrl: "https://evil.com/x" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("attaches first-touch attribution to the site_created event", async () => {
    attributionMock.mockResolvedValueOnce({ utm_source: "blog", utm_medium: "post_cta" })
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "t@t.com" }),
    })
    await POST(req)
    expect(trackEventMock).toHaveBeenCalledWith(
      "site_created",
      expect.objectContaining({ meta: expect.objectContaining({ attribution: { utm_source: "blog", utm_medium: "post_cta" } }) })
    )
  })

  it("marks onboarding as completed", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    await POST(req)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { completed_onboarding: true },
      })
    )
  })

  it("tracks site_created event", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    await POST(req)
    expect(trackEventMock).toHaveBeenCalledWith("site_created", expect.objectContaining({ userId: "user-1" }))
  })

  it("returns 404 when getActiveSiteId returns null", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("No site found")
  })

  it("returns 500 when prisma.profile.update throws", async () => {
    prismaMock.profile.update.mockRejectedValue(new Error("DB error"))
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe("DB error")
  })

  it("handles multipart/form-data content type", async () => {
    const form = new FormData()
    form.append("displayName", "Maria Souza")
    form.append("areas", JSON.stringify(["Trabalhista"]))
    form.append("email", "maria@test.com")
    form.append("about", "Especialista em CLT")
    form.append("headline", "Advogada")
    form.append("phone", "11999999999")
    form.append("cellphone", "11988888888")
    form.append("whatsapp", "5511999999999")
    form.append("instagramUrl", "https://instagram.com/maria")
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      body: form,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publicName: "Maria Souza" }),
      })
    )
  })

  it("rejects a spoofed photo with 400 before calling OpenAI or S3", async () => {
    const form = new FormData()
    form.append("displayName", "Maria Souza")
    form.append("areas", JSON.stringify(["Direito Civil"]))
    form.append("email", "maria@test.com")
    form.append("photo", spoofedHtmlFile("photo.jpg"))
    const res = await POST(new Request("http://localhost/api/onboarding/profile", { method: "POST", body: form }))
    expect(res.status).toBe(400)
    expect(uploadToS3Mock).not.toHaveBeenCalled()
    expect(generateMock).not.toHaveBeenCalled()
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("uploads avatar when photo file provided via multipart", async () => {
    const photoFile = jpegFile("photo.jpg")
    const form = new FormData()
    form.append("displayName", "Maria Souza")
    form.append("areas", "[]")
    form.append("email", "maria@test.com")
    form.append("photo", photoFile)
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      body: form,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalled()
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avatarUrl: "https://s3.test/avatar.jpg" }),
      })
    )
  })

  it("skips AI generation when areas list is empty", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", areas: [], email: "test@test.com" }),
    })
    await POST(req)
    expect(generateMock).not.toHaveBeenCalled()
    expect(prismaMock.activityAreas.createMany).not.toHaveBeenCalled()
  })

  it("deduplicates areas before creating activity areas", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Test",
        areas: ["Civil", "Civil", "Penal"],
        email: "test@test.com",
      }),
    })
    await POST(req)
    expect(generateMock).toHaveBeenCalledWith(["Civil", "Penal"], expect.any(String))
    expect(prismaMock.activityAreas.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ title: "Civil" }),
          expect.objectContaining({ title: "Penal" }),
        ]),
      })
    )
    const createManyCall = prismaMock.activityAreas.createMany.mock.calls[0][0]
    expect(createManyCall.data).toHaveLength(2)
  })

  it("generates slug with -adv suffix for reserved slugs", async () => {
    // Use a name that resolves to a reserved slug word
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Login", email: "login@test.com" }),
    })
    await POST(req)
    const updateArg = prismaMock.profile.update.mock.calls[0][0]
    expect(updateArg.data.slug).toContain("-adv")
  })

  it("handles slug collision by appending suffix", async () => {
    // First call to findFirst returns a conflict, second returns null
    prismaMock.profile.findFirst
      .mockResolvedValueOnce({ id: "other-profile" }) // conflict
      .mockResolvedValueOnce(null) // no conflict on second attempt
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "João Silva", email: "joao@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    // Called twice to resolve the collision
    expect(prismaMock.profile.findFirst).toHaveBeenCalledTimes(2)
  })

  it("sets setupComplete to true in profile update", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    await POST(req)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ setupComplete: true }),
      })
    )
  })

  it("includes metaTitle set to displayName in profile update", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Dr. Carlos", email: "carlos@test.com" }),
    })
    await POST(req)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metaTitle: "Dr. Carlos" }),
      })
    )
  })

  it("defaults slug to 'user' when displayName is empty", async () => {
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "", email: "empty@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const updateArg = prismaMock.profile.update.mock.calls[0][0]
    expect(updateArg.data.slug).toBe("user")
  })

  it("returns 500 with formatted error message from catch block (line 148)", async () => {
    prismaMock.profile.update.mockRejectedValue({ message: "Unique constraint failed" })
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test", email: "test@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe("Unique constraint failed")
  })

  it("handles multiple slug collision iterations (lines 71-91)", async () => {
    // Three consecutive collisions, then success on the 4th attempt
    prismaMock.profile.findFirst
      .mockResolvedValueOnce({ id: "conflict-1" })
      .mockResolvedValueOnce({ id: "conflict-2" })
      .mockResolvedValueOnce({ id: "conflict-3" })
      .mockResolvedValueOnce(null)
    const req = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Popular Name", email: "popular@test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.findFirst).toHaveBeenCalledTimes(4)
    const updateArg = prismaMock.profile.update.mock.calls[0][0]
    // The final slug should contain a suffix (number + random chars)
    expect(updateArg.data.slug).toContain("popular-name")
    expect(updateArg.data.slug).not.toBe("popular-name")
  })

  describe("OpenAI input limits and rate limiting", () => {
    const base = { displayName: "Maria", email: "maria@test.com" }

    it("returns 400 for more than 20 areas without calling OpenAI", async () => {
      const areas = Array.from({ length: 21 }, (_, i) => `Área ${i}`)
      const res = await POST(jsonReq({ ...base, areas }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/no máximo 20/)
      expect(generateMock).not.toHaveBeenCalled()
    })

    it("accepts exactly 20 areas", async () => {
      generateMock.mockResolvedValue([])
      const areas = Array.from({ length: 20 }, (_, i) => `Área ${i}`)
      expect((await POST(jsonReq({ ...base, areas }))).status).toBe(200)
    })

    it("returns 400 for an area title longer than 120 characters", async () => {
      const res = await POST(jsonReq({ ...base, areas: ["x".repeat(121)] }))
      expect(res.status).toBe(400)
      expect(generateMock).not.toHaveBeenCalled()
    })

    it("returns 400 when areas is not an array of strings", async () => {
      expect((await POST(jsonReq({ ...base, areas: "Direito Civil" }))).status).toBe(400)
      expect((await POST(jsonReq({ ...base, areas: [{ title: "x" }] }))).status).toBe(400)
    })

    it("returns 429 with Retry-After after 10 submissions per user per hour", async () => {
      generateMock.mockResolvedValue(["desc"])
      for (let i = 0; i < 10; i++) {
        expect((await POST(jsonReq({ ...base, areas: ["Direito Civil"] }))).status).toBe(200)
      }
      generateMock.mockClear()
      const res = await POST(jsonReq({ ...base, areas: ["Direito Civil"] }))
      expect(res.status).toBe(429)
      expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
      expect(generateMock).not.toHaveBeenCalled()
    })
  })
})
