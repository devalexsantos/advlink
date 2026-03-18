// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    activityAreas: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fns: Promise<unknown>[]) => Promise.all(fns)),
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/cover.jpg" }),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { POST, PATCH, DELETE } from "@/app/api/activity-areas/route"

const session = { user: { id: "user-1" } }

describe("POST /api/activity-areas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.activityAreas.findFirst.mockResolvedValue({ position: 2 })
    prismaMock.activityAreas.create.mockResolvedValue({ id: "a1", title: "Civil", position: 3 })
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/activity-areas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Civil" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("creates area with correct position", async () => {
    const req = new Request("http://localhost/api/activity-areas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Direito Penal", description: "Defesa criminal" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.activityAreas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Direito Penal", position: 3 }),
      })
    )
  })
})

describe("PATCH /api/activity-areas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
  })

  it("updates a single area", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue({ id: "a1", profileId: "profile-1", position: 1 })
    prismaMock.activityAreas.update.mockResolvedValue({ id: "a1", title: "Updated" })
    const req = new Request("http://localhost/api/activity-areas", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "a1", title: "Updated" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it("reorders areas via transaction", async () => {
    prismaMock.activityAreas.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }])
    prismaMock.activityAreas.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/activity-areas", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: [{ id: "a1", position: 2 }, { id: "a2", position: 1 }] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/activity-areas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
  })

  it("returns 400 without id", async () => {
    const req = new Request("http://localhost/api/activity-areas?id=", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 if not owned", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/activity-areas?id=xxx", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it("deletes and reindexes", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue({ id: "a1" })
    prismaMock.activityAreas.delete.mockResolvedValue({})
    prismaMock.activityAreas.findMany.mockResolvedValue([{ id: "a2" }])
    prismaMock.activityAreas.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/activity-areas?id=a1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })
})
