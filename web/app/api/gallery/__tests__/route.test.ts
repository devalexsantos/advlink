// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock } = vi.hoisted(() => ({
  prismaMock: {
    gallery: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fns: Promise<unknown>[]) => Promise.all(fns)),
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/gallery.jpg" }),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))

import { POST, PATCH, DELETE } from "@/app/api/gallery/route"

const session = { user: { id: "user-1" } }

describe("POST /api/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.gallery.findFirst.mockResolvedValue({ position: 1 })
    prismaMock.gallery.create.mockResolvedValue({ id: "g1", position: 2 })
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("cover", new File(["img"], "photo.jpg", { type: "image/jpeg" }))
    const req = new Request("http://localhost/api/gallery", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("uploads image and creates gallery item", async () => {
    const form = new FormData()
    form.append("cover", new File(["img"], "photo.jpg", { type: "image/jpeg" }))
    const req = new Request("http://localhost/api/gallery", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalled()
    expect(prismaMock.gallery.create).toHaveBeenCalled()
  })
})

describe("PATCH /api/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("reorders gallery items", async () => {
    prismaMock.gallery.findMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }])
    prismaMock.gallery.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/gallery", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: [{ id: "g1", position: 2 }, { id: "g2", position: 1 }] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it("returns 403 for unowned items", async () => {
    prismaMock.gallery.findMany.mockResolvedValue([{ id: "g1" }]) // only owns g1
    const req = new Request("http://localhost/api/gallery", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: [{ id: "g1", position: 1 }, { id: "g999", position: 2 }] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("returns 400 without id", async () => {
    const req = new Request("http://localhost/api/gallery?id=", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 if not owned", async () => {
    prismaMock.gallery.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/gallery?id=xxx", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it("deletes and reindexes", async () => {
    prismaMock.gallery.findFirst.mockResolvedValue({ id: "g1" })
    prismaMock.gallery.delete.mockResolvedValue({})
    prismaMock.gallery.findMany.mockResolvedValue([{ id: "g2" }])
    prismaMock.gallery.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/gallery?id=g1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })
})
