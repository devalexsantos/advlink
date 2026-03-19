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

  it("updates area via multipart/form-data without cover", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue({ id: "a1", profileId: "profile-1", position: 1 })
    prismaMock.activityAreas.update.mockResolvedValue({ id: "a1", title: "Updated" })
    const form = new FormData()
    form.append("id", "a1")
    form.append("title", "Updated")
    form.append("description", "Desc")
    const req = new Request("http://localhost/api/activity-areas", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.area).toEqual({ id: "a1", title: "Updated" })
    expect(uploadToS3Mock).not.toHaveBeenCalled()
    expect(prismaMock.activityAreas.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { title: "Updated", description: "Desc", coverImageUrl: undefined },
    })
  })

  it("updates area via multipart/form-data with cover File and uploads to S3", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue({ id: "a1", profileId: "profile-1", position: 1 })
    prismaMock.activityAreas.update.mockResolvedValue({ id: "a1", title: "WithCover", coverImageUrl: "https://s3.test/cover.jpg" })
    const file = new File([new Uint8Array([137, 80, 78, 71])], "cover.png", { type: "image/png" })
    const form = new FormData()
    form.append("id", "a1")
    form.append("title", "WithCover")
    form.append("description", "")
    form.append("cover", file)
    const req = new Request("http://localhost/api/activity-areas", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/png",
        cacheControl: "public, max-age=604800, immutable",
      })
    )
    expect(prismaMock.activityAreas.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: expect.objectContaining({ coverImageUrl: "https://s3.test/cover.jpg" }),
    })
  })

  it("returns 404 via multipart/form-data when area not owned by user", async () => {
    prismaMock.activityAreas.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("id", "not-owned")
    form.append("title", "T")
    const req = new Request("http://localhost/api/activity-areas", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Not found")
  })

  it("returns 415 for unsupported content-type", async () => {
    const req = new Request("http://localhost/api/activity-areas", {
      method: "PATCH",
      headers: { "content-type": "text/plain" },
      body: "some text",
    })
    const res = await PATCH(req)
    expect(res.status).toBe(415)
    const json = await res.json()
    expect(json.error).toBe("Unsupported content type")
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
