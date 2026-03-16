// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock } = vi.hoisted(() => ({
  prismaMock: {
    links: {
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
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))

import { POST, PATCH, DELETE } from "@/app/api/links/route"

const session = { user: { id: "user-1" } }

describe("POST /api/links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.links.findFirst.mockResolvedValue({ position: 2 })
    prismaMock.links.create.mockResolvedValue({ id: "l1", title: "Link", position: 3 })
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Test", url: "https://test.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("creates link with correct position", async () => {
    const req = new Request("http://localhost/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "My Link", url: "https://example.com" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.links.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "My Link", position: 3 }),
      })
    )
  })

  it("returns 400 for missing title or url", async () => {
    const req = new Request("http://localhost/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "", url: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("updates a single link", async () => {
    prismaMock.links.findFirst.mockResolvedValue({ id: "l1", userId: "user-1", position: 1 })
    prismaMock.links.update.mockResolvedValue({ id: "l1", title: "Updated" })
    const req = new Request("http://localhost/api/links", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "l1", title: "Updated", url: "https://test.com" }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it("reorders links via transaction", async () => {
    prismaMock.links.findMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }])
    prismaMock.links.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/links", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: [{ id: "l1", position: 2 }, { id: "l2", position: 1 }] }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("returns 400 without id", async () => {
    const req = new Request("http://localhost/api/links?id=", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 if not owned by user", async () => {
    prismaMock.links.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/links?id=xxx", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it("deletes and reindexes", async () => {
    prismaMock.links.findFirst.mockResolvedValue({ id: "l1", userId: "user-1" })
    prismaMock.links.delete.mockResolvedValue({})
    prismaMock.links.findMany.mockResolvedValue([{ id: "l2" }])
    prismaMock.links.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/links?id=l1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.links.delete).toHaveBeenCalledWith({ where: { id: "l1" } })
  })
})
