// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    activityAreas: { findMany: vi.fn() },
    address: { findUnique: vi.fn(), upsert: vi.fn() },
    links: { findMany: vi.fn() },
    gallery: { findMany: vi.fn() },
    customSection: { findMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/photo.jpg" }),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/reserved-slugs", async (importOriginal) => importOriginal())

import { GET, PATCH } from "@/app/api/profile/route"

const session = { user: { id: "user-1" } }

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.profile.findUnique.mockResolvedValue(null)
    prismaMock.activityAreas.findMany.mockResolvedValue([])
    prismaMock.address.findUnique.mockResolvedValue(null)
    prismaMock.links.findMany.mockResolvedValue([])
    prismaMock.gallery.findMany.mockResolvedValue([])
    prismaMock.customSection.findMany.mockResolvedValue([])
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns profile data", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const profile = { id: "p1", publicName: "Test", slug: "test" }
    prismaMock.profile.findUnique.mockResolvedValue(profile)
    prismaMock.activityAreas.findMany.mockResolvedValue([{ id: "a1", title: "Civil" }])

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.profile.publicName).toBe("Test")
    expect(data.areas).toHaveLength(1)
  })

  it("returns null profile when none exists", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const res = await GET()
    const data = await res.json()
    expect(data.profile).toBeNull()
  })
})

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.profile.findUnique.mockResolvedValue({ id: "p1", slug: "existing" })
    prismaMock.profile.upsert.mockResolvedValue({ id: "p1", publicName: "Updated" })
    prismaMock.address.upsert.mockResolvedValue({})
    prismaMock.address.findUnique.mockResolvedValue(null)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Test" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("updates profile via JSON", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Updated Name" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.upsert).toHaveBeenCalled()
  })

  it("handles sectionOrder update", async () => {
    prismaMock.profile.update.mockResolvedValue({ id: "p1", sectionOrder: ["sobre", "servicos"] })
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionOrder: ["sobre", "servicos"] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalled()
  })

  it("auto-generates slug on first profile creation", async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null) // no existing profile
    prismaMock.profile.findFirst.mockResolvedValue(null) // slug not taken
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "João Silva" }),
    })
    await PATCH(req)
    const upsertCall = prismaMock.profile.upsert.mock.calls[0][0]
    expect(upsertCall.create.slug).toBeDefined()
  })

  it("appends -adv to reserved slugs", async () => {
    prismaMock.profile.findUnique.mockResolvedValue(null)
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicName: "Admin", slug: "admin" }),
    })
    await PATCH(req)
    const upsertCall = prismaMock.profile.upsert.mock.calls[0][0]
    expect(upsertCall.update.slug).toContain("admin-adv")
  })
})
