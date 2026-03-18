import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

import {
  fetchProfile,
  updateProfile,
  createArea,
  patchArea,
  reorderAreas,
  deleteArea,
  createLink,
  patchLink,
  reorderLinks,
  deleteLink,
  updateSectionConfig,
  uploadGalleryPhoto,
  reorderGallery,
  deleteGallery,
  createCustomSection,
  patchCustomSection,
  deleteCustomSection,
} from "@/app/profile/edit/api"

function makeOkResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  }
}

function makeErrorResponse(status = 500) {
  return { ok: false, status }
}

describe("api.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // fetchProfile
  // ---------------------------------------------------------------------------

  describe("fetchProfile", () => {
    it("calls GET /api/profile with cache: no-store", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ profile: null, areas: [], links: [], gallery: [], customSections: [] }))
      await fetchProfile()
      expect(mockFetch).toHaveBeenCalledWith("/api/profile", { cache: "no-store" })
    })

    it("returns parsed JSON on success", async () => {
      const payload = { profile: { publicName: "Dr. Ana" }, areas: [], links: [], gallery: [], customSections: [] }
      mockFetch.mockResolvedValueOnce(makeOkResponse(payload))
      const result = await fetchProfile()
      expect(result).toEqual(payload)
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(fetchProfile()).rejects.toThrow("Falha ao carregar perfil")
    })
  })

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------

  describe("updateProfile", () => {
    it("calls PATCH /api/profile with FormData body", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ profile: {} }))
      const fd = new FormData()
      fd.set("publicName", "Dr. João")
      await updateProfile(fd)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/profile")
      expect(init.method).toBe("PATCH")
      expect(init.body).toBe(fd)
    })

    it("returns JSON on success", async () => {
      const body = { profile: { publicName: "Dr. João" } }
      mockFetch.mockResolvedValueOnce(makeOkResponse(body))
      const result = await updateProfile(new FormData())
      expect(result).toEqual(body)
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(updateProfile(new FormData())).rejects.toThrow("Falha ao salvar perfil")
    })
  })

  // ---------------------------------------------------------------------------
  // createArea
  // ---------------------------------------------------------------------------

  describe("createArea", () => {
    it("POSTs to /api/activity-areas with default title/description", async () => {
      const area = { id: "a1", title: "Nova área", description: "Descrição da área." }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ area }))
      const result = await createArea()
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/activity-areas")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body as string)).toMatchObject({ title: "Nova área" })
      expect(result).toEqual({ area })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(createArea()).rejects.toThrow("Falha ao criar área")
    })
  })

  // ---------------------------------------------------------------------------
  // patchArea
  // ---------------------------------------------------------------------------

  describe("patchArea", () => {
    it("PATCHes /api/activity-areas with area payload", async () => {
      const area = { id: "a1", title: "Direito Civil", description: "Desc.", position: 0 }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ area }))
      await patchArea(area)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/activity-areas")
      expect(init.method).toBe("PATCH")
      expect(JSON.parse(init.body as string)).toEqual(area)
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(patchArea({ id: "a1", title: "X", description: null })).rejects.toThrow("Falha ao salvar área")
    })
  })

  // ---------------------------------------------------------------------------
  // reorderAreas
  // ---------------------------------------------------------------------------

  describe("reorderAreas", () => {
    it("PATCHes /api/activity-areas with order array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      const order = [{ id: "a1", position: 0 }, { id: "a2", position: 1 }]
      await reorderAreas(order)
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(JSON.parse(init.body as string)).toEqual({ order })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(reorderAreas([])).rejects.toThrow("Falha ao reordenar áreas")
    })
  })

  // ---------------------------------------------------------------------------
  // deleteArea
  // ---------------------------------------------------------------------------

  describe("deleteArea", () => {
    it("DELETEs /api/activity-areas?id=<id>", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      await deleteArea("a1")
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/activity-areas?id=a1")
      expect(init.method).toBe("DELETE")
    })

    it("URL-encodes the id", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      await deleteArea("a b/c")
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/activity-areas?id=a%20b%2Fc")
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(deleteArea("a1")).rejects.toThrow("Falha ao excluir área")
    })
  })

  // ---------------------------------------------------------------------------
  // createLink
  // ---------------------------------------------------------------------------

  describe("createLink", () => {
    it("POSTs to /api/links with default link data", async () => {
      const link = { id: "l1", title: "Novo link", description: "", url: "https://" }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ link }))
      const result = await createLink()
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/links")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body as string)).toMatchObject({ title: "Novo link" })
      expect(result).toEqual({ link })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(createLink()).rejects.toThrow("Falha ao criar link")
    })
  })

  // ---------------------------------------------------------------------------
  // patchLink
  // ---------------------------------------------------------------------------

  describe("patchLink", () => {
    it("PATCHes /api/links with link payload", async () => {
      const link = { id: "l1", title: "LinkedIn", description: null, url: "https://linkedin.com" }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ link }))
      await patchLink(link)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/links")
      expect(init.method).toBe("PATCH")
      expect(JSON.parse(init.body as string)).toEqual(link)
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(patchLink({ id: "l1", title: "X", description: null, url: "https://" })).rejects.toThrow("Falha ao salvar link")
    })
  })

  // ---------------------------------------------------------------------------
  // reorderLinks
  // ---------------------------------------------------------------------------

  describe("reorderLinks", () => {
    it("PATCHes /api/links with order array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      const order = [{ id: "l1", position: 0 }]
      await reorderLinks(order)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/links")
      expect(JSON.parse(init.body as string)).toEqual({ order })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(reorderLinks([])).rejects.toThrow("Falha ao reordenar links")
    })
  })

  // ---------------------------------------------------------------------------
  // deleteLink
  // ---------------------------------------------------------------------------

  describe("deleteLink", () => {
    it("DELETEs /api/links?id=<id>", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      await deleteLink("l1")
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/links?id=l1")
      expect(init.method).toBe("DELETE")
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(deleteLink("l1")).rejects.toThrow("Falha ao excluir link")
    })
  })

  // ---------------------------------------------------------------------------
  // updateSectionConfig
  // ---------------------------------------------------------------------------

  describe("updateSectionConfig", () => {
    it("PATCHes /api/profile with JSON body", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}))
      const config = { sectionOrder: ["servicos", "sobre"], sectionLabels: { servicos: "Serviços" } }
      await updateSectionConfig(config)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/profile")
      expect(init.method).toBe("PATCH")
      expect(init.headers).toMatchObject({ "Content-Type": "application/json" })
      expect(JSON.parse(init.body as string)).toEqual(config)
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(updateSectionConfig({})).rejects.toThrow("Falha ao salvar configuração das seções")
    })
  })

  // ---------------------------------------------------------------------------
  // uploadGalleryPhoto
  // ---------------------------------------------------------------------------

  describe("uploadGalleryPhoto", () => {
    it("POSTs to /api/gallery with FormData containing cover field", async () => {
      const item = { id: "g1", coverImageUrl: "https://example.com/photo.jpg" }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ item }))
      const file = new File(["data"], "photo.jpg", { type: "image/jpeg" })
      const result = await uploadGalleryPhoto(file)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/gallery")
      expect(init.method).toBe("POST")
      expect(init.body).toBeInstanceOf(FormData)
      expect((init.body as FormData).get("cover")).toBe(file)
      expect(result).toEqual({ item })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(uploadGalleryPhoto(new File([], "x.jpg"))).rejects.toThrow("Falha ao enviar foto")
    })
  })

  // ---------------------------------------------------------------------------
  // reorderGallery
  // ---------------------------------------------------------------------------

  describe("reorderGallery", () => {
    it("PATCHes /api/gallery with order array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      const order = [{ id: "g1", position: 0 }]
      await reorderGallery(order)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/gallery")
      expect(JSON.parse(init.body as string)).toEqual({ order })
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(reorderGallery([])).rejects.toThrow("Falha ao reordenar galeria")
    })
  })

  // ---------------------------------------------------------------------------
  // deleteGallery
  // ---------------------------------------------------------------------------

  describe("deleteGallery", () => {
    it("DELETEs /api/gallery?id=<id>", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      await deleteGallery("g1")
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/gallery?id=g1")
      expect(init.method).toBe("DELETE")
    })

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse())
      await expect(deleteGallery("g1")).rejects.toThrow("Falha ao excluir foto da galeria")
    })
  })

  // ---------------------------------------------------------------------------
  // createCustomSection
  // ---------------------------------------------------------------------------

  describe("createCustomSection", () => {
    it("POSTs to /api/custom-sections with FormData", async () => {
      const section = { id: "cs1", title: "Seção nova", description: null, imageUrl: null, layout: "text-only", iconName: "Star" }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ section }))
      const fd = new FormData()
      fd.set("title", "Seção nova")
      const result = await createCustomSection(fd)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/custom-sections")
      expect(init.method).toBe("POST")
      expect(init.body).toBe(fd)
      expect(result).toEqual({ section })
    })

    it("throws when response is not ok using error from response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Título obrigatório" }),
      })
      await expect(createCustomSection(new FormData())).rejects.toThrow("Título obrigatório")
    })

    it("throws generic message when body has no error field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      await expect(createCustomSection(new FormData())).rejects.toThrow("Falha ao criar seção")
    })
  })

  // ---------------------------------------------------------------------------
  // patchCustomSection
  // ---------------------------------------------------------------------------

  describe("patchCustomSection", () => {
    it("sets id on FormData and PATCHes /api/custom-sections", async () => {
      const section = { id: "cs1", title: "Seção atualizada", description: null, imageUrl: null, layout: "text-only", iconName: "Star" }
      mockFetch.mockResolvedValueOnce(makeOkResponse({ section }))
      const fd = new FormData()
      fd.set("title", "Seção atualizada")
      await patchCustomSection("cs1", fd)
      expect(fd.get("id")).toBe("cs1")
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/custom-sections")
      expect(init.method).toBe("PATCH")
    })

    it("throws when response is not ok using error from response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Não encontrado" }),
      })
      await expect(patchCustomSection("cs1", new FormData())).rejects.toThrow("Não encontrado")
    })
  })

  // ---------------------------------------------------------------------------
  // deleteCustomSection
  // ---------------------------------------------------------------------------

  describe("deleteCustomSection", () => {
    it("DELETEs /api/custom-sections?id=<id>", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }))
      await deleteCustomSection("cs1")
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/custom-sections?id=cs1")
      expect(init.method).toBe("DELETE")
    })

    it("throws when response is not ok using error from response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Não autorizado" }),
      })
      await expect(deleteCustomSection("cs1")).rejects.toThrow("Não autorizado")
    })
  })
})
