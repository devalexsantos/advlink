// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock } = vi.hoisted(() => ({
  prismaMock: {
    customSection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/section.jpg" }),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))

import { POST, PATCH, DELETE } from "@/app/api/custom-sections/route"

const session = { user: { id: "user-1" } }

describe("POST /api/custom-sections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    prismaMock.customSection.create.mockResolvedValue({ id: "cs1", title: "Minha Seção" })
    prismaMock.profile.findUnique.mockResolvedValue({ sectionOrder: ["servicos", "sobre"] })
    prismaMock.profile.update.mockResolvedValue({})
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("title", "Test")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("creates section and appends to sectionOrder", async () => {
    const form = new FormData()
    form.append("title", "Minha Seção")
    form.append("layout", "text-only")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.create).toHaveBeenCalled()
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sectionOrder: ["servicos", "sobre", "custom_cs1"] },
      })
    )
  })

  it("returns 400 for missing title", async () => {
    const form = new FormData()
    form.append("title", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid layout", async () => {
    const form = new FormData()
    form.append("title", "Test")
    form.append("layout", "invalid")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/custom-sections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("deletes and removes from sectionOrder", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue({ id: "cs1" })
    prismaMock.customSection.delete.mockResolvedValue({})
    prismaMock.profile.findUnique.mockResolvedValue({
      sectionOrder: ["servicos", "custom_cs1", "sobre"],
      sectionLabels: { custom_cs1: "Custom" },
      sectionIcons: { custom_cs1: "Star" },
    })
    prismaMock.profile.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/custom-sections?id=cs1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sectionOrder: ["servicos", "sobre"],
        }),
      })
    )
  })

  it("returns 404 for unowned section", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/custom-sections?id=xxx", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})
