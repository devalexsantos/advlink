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
vi.mock("@/lib/video-embed", () => ({
  getVideoEmbedUrl: (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/abc` }
    if (url.includes("vimeo.com")) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/123` }
    return null
  },
}))

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

  it("returns 400 for missing title on non-button layout", async () => {
    const form = new FormData()
    form.append("title", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("allows empty title for button layout", async () => {
    const form = new FormData()
    form.append("title", "")
    form.append("layout", "button")
    form.append("buttonConfig", JSON.stringify({
      url: "https://example.com",
      label: "Clique aqui",
      bgColor: "#000000",
      textColor: "#FFFFFF",
      borderRadius: 8,
    }))
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it("returns 400 for invalid layout", async () => {
    const form = new FormData()
    form.append("title", "Test")
    form.append("layout", "invalid")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates video section with valid YouTube URL", async () => {
    const form = new FormData()
    form.append("title", "Meu Vídeo")
    form.append("layout", "video")
    form.append("videoUrl", "https://www.youtube.com/watch?v=abc123")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ layout: "video", videoUrl: "https://www.youtube.com/watch?v=abc123" }),
      })
    )
  })

  it("creates video section with valid Vimeo URL", async () => {
    const form = new FormData()
    form.append("title", "Meu Vídeo")
    form.append("layout", "video")
    form.append("videoUrl", "https://vimeo.com/123456")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it("returns 400 for video layout without valid URL", async () => {
    const form = new FormData()
    form.append("title", "Meu Vídeo")
    form.append("layout", "video")
    form.append("videoUrl", "https://example.com/random")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates button section with valid buttonConfig", async () => {
    const form = new FormData()
    form.append("title", "Meu Botão")
    form.append("layout", "button")
    form.append("buttonConfig", JSON.stringify({
      url: "https://example.com",
      label: "Clique aqui",
      bgColor: "#000000",
      textColor: "#FFFFFF",
      borderRadius: 8,
    }))
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ layout: "button" }),
      })
    )
  })

  it("returns 400 for button layout without buttonConfig", async () => {
    const form = new FormData()
    form.append("title", "Meu Botão")
    form.append("layout", "button")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("accepts video and button as valid layouts", async () => {
    for (const layoutVal of ["video", "button"]) {
      const form = new FormData()
      form.append("title", "Test")
      form.append("layout", layoutVal)
      if (layoutVal === "video") form.append("videoUrl", "https://www.youtube.com/watch?v=abc")
      if (layoutVal === "button") form.append("buttonConfig", JSON.stringify({ url: "https://test.com", label: "Go" }))
      const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
      const res = await POST(req)
      expect(res.status).not.toBe(400)
    }
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
