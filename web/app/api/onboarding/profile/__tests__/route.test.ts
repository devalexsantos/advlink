// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

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

import { POST } from "@/app/api/onboarding/profile/route"

const session = { user: { id: "user-1" } }

describe("POST /api/onboarding/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it("uploads avatar when photo file provided via multipart", async () => {
    const photoFile = new File(["img"], "photo.jpg", { type: "image/jpeg" })
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
})
