// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, getActiveSiteIdMock } = vi.hoisted(() => ({
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
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
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
    getActiveSiteIdMock.mockResolvedValue("profile-1")
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

describe("PATCH /api/custom-sections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue({
      id: "cs1",
      title: "Old Title",
      description: "Old Desc",
      layout: "text-only",
      iconName: "FileText",
      imageUrl: null,
      videoUrl: null,
      buttonConfig: null,
    })
    prismaMock.customSection.update.mockResolvedValue({ id: "cs1", title: "New Title" })
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("id", "cs1")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("returns 404 when getActiveSiteId returns null", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("id", "cs1")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("No site found")
  })

  it("returns 400 when id is missing", async () => {
    const form = new FormData()
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("ID é obrigatório")
  })

  it("returns 404 when section not found for this profile", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("id", "no-such-id")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("Seção não encontrada")
  })

  it("updates section title and description", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("title", "New Title")
    form.append("description", "New Desc")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cs1" },
        data: expect.objectContaining({ title: "New Title", description: "New Desc" }),
      })
    )
  })

  it("preserves existing title when title is not supplied", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    // no title field — should fall back to existing.title
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Old Title" }),
      })
    )
  })

  it("sets description to null when description is empty string", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("description", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      })
    )
  })

  it("updates videoUrl when form has videoUrl field", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("videoUrl", "https://www.youtube.com/watch?v=newvid")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoUrl: "https://www.youtube.com/watch?v=newvid" }),
      })
    )
  })

  it("sets videoUrl to null when empty string is supplied", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("videoUrl", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoUrl: null }),
      })
    )
  })

  it("updates buttonConfig when valid JSON is supplied", async () => {
    const config = { url: "https://example.com", label: "Click" }
    const form = new FormData()
    form.append("id", "cs1")
    form.append("buttonConfig", JSON.stringify(config))
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buttonConfig: config }),
      })
    )
  })

  it("accepts empty buttonConfig string without error (clears to JsonNull)", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("buttonConfig", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    // Route falls back to Prisma.JsonNull — update is still called and returns 200
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.update).toHaveBeenCalled()
  })

  it("accepts invalid JSON in buttonConfig without error (clears to JsonNull)", async () => {
    const form = new FormData()
    form.append("id", "cs1")
    form.append("buttonConfig", "NOT_JSON{{{")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(prismaMock.customSection.update).toHaveBeenCalled()
  })

  it("sets imageUrl to null when removeImage is 'true'", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue({
      id: "cs1",
      title: "T",
      description: null,
      layout: "text-only",
      iconName: "FileText",
      imageUrl: "https://s3.test/old.jpg",
      videoUrl: null,
      buttonConfig: null,
    })
    const form = new FormData()
    form.append("id", "cs1")
    form.append("removeImage", "true")
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    await PATCH(req)
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: null }),
      })
    )
  })

  it("uploads a new image when image file is provided", async () => {
    const imageFile = new File(["img-data"], "photo.jpg", { type: "image/jpeg" })
    const form = new FormData()
    form.append("id", "cs1")
    form.append("image", imageFile)
    const req = new Request("http://localhost/api/custom-sections", { method: "PATCH", body: form })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalled()
    expect(prismaMock.customSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://s3.test/section.jpg" }),
      })
    )
  })

})

describe("POST /api/custom-sections — no site found", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 404 when getActiveSiteId returns null", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("title", "Test")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("No site found")
  })

  it("returns 400 for button layout with invalid (non-http) URL in buttonConfig", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("title", "")
    form.append("layout", "button")
    form.append("buttonConfig", JSON.stringify({ url: "ftp://example.com", label: "Click" }))
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/URL do botão/i)
  })

  it("returns 400 for button layout with missing label in buttonConfig", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("title", "")
    form.append("layout", "button")
    form.append("buttonConfig", JSON.stringify({ url: "https://example.com" }))
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Texto do botão/i)
  })

  it("returns 400 for video layout with empty videoUrl", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    const form = new FormData()
    form.append("title", "Video")
    form.append("layout", "video")
    form.append("videoUrl", "")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/URL de vídeo inválida/i)
  })

  it("appends to sectionOrder even when existing profile has null sectionOrder", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    prismaMock.customSection.create.mockResolvedValue({ id: "cs2", title: "Novo" })
    prismaMock.profile.findUnique.mockResolvedValue({ sectionOrder: null })
    prismaMock.profile.update.mockResolvedValue({})
    const form = new FormData()
    form.append("title", "Novo")
    form.append("layout", "text-only")
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sectionOrder: ["custom_cs2"] },
      })
    )
  })

  it("uploads image file during POST creation", async () => {
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.customSection.findFirst.mockResolvedValue(null)
    prismaMock.customSection.create.mockResolvedValue({ id: "cs3", title: "With Image" })
    prismaMock.profile.findUnique.mockResolvedValue({ sectionOrder: [] })
    prismaMock.profile.update.mockResolvedValue({})
    const imageFile = new File(["img-data"], "photo.jpg", { type: "image/jpeg" })
    const form = new FormData()
    form.append("title", "With Image")
    form.append("layout", "image-left")
    form.append("image", imageFile)
    const req = new Request("http://localhost/api/custom-sections", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalled()
    expect(prismaMock.customSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrl: "https://s3.test/section.jpg" }),
      })
    )
  })
})

describe("DELETE /api/custom-sections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue("profile-1")
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

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/custom-sections?id=cs1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it("returns 404 when getActiveSiteId returns null", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/custom-sections?id=cs1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("No site found")
  })

  it("returns 400 when id query param is missing", async () => {
    const req = new Request("http://localhost/api/custom-sections", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("ID é obrigatório")
  })

  it("does not call profile.update when profile has no sectionOrder/Labels/Icons", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue({ id: "cs1" })
    prismaMock.customSection.delete.mockResolvedValue({})
    prismaMock.profile.findUnique.mockResolvedValue({
      sectionOrder: null,
      sectionLabels: null,
      sectionIcons: null,
    })
    prismaMock.profile.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/custom-sections?id=cs1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("removes sectionLabels entry when sectionLabels exists but sectionOrder is null", async () => {
    prismaMock.customSection.findFirst.mockResolvedValue({ id: "cs1" })
    prismaMock.customSection.delete.mockResolvedValue({})
    prismaMock.profile.findUnique.mockResolvedValue({
      sectionOrder: null,
      sectionLabels: { custom_cs1: "Custom Label" },
      sectionIcons: null,
    })
    prismaMock.profile.update.mockResolvedValue({})
    const req = new Request("http://localhost/api/custom-sections?id=cs1", { method: "DELETE" })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sectionLabels: {} },
      })
    )
  })
})
