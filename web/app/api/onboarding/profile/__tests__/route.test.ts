// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, generateMock, trackEventMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    profile: { findFirst: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
    activityAreas: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/avatar.jpg" }),
  generateMock: vi.fn().mockResolvedValue(["Desc 1"]),
  trackEventMock: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/openai", () => ({ generateActivityDescriptions: generateMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("@/lib/reserved-slugs", async (importOriginal) => importOriginal())

import { POST } from "@/app/api/onboarding/profile/route"

const session = { user: { id: "user-1" } }

describe("POST /api/onboarding/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" })
    prismaMock.profile.findFirst.mockResolvedValue(null)
    prismaMock.profile.upsert.mockResolvedValue({})
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

  it("creates profile with slug", async () => {
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
    expect(prismaMock.profile.upsert).toHaveBeenCalled()
    const upsertArg = prismaMock.profile.upsert.mock.calls[0][0]
    expect(upsertArg.create.slug).toContain("joao-silva")
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
})
