// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { pngFile, spoofedHtmlFile } from "@/test/fixtures/images"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock, uploadToS3Mock } = vi.hoisted(() => ({
  prismaMock: {
    article: { findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/cover.png" }),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))

import { DELETE, GET, PATCH } from "@/app/api/articles/[id]/route"

const ctx = (id = "a1") => ({ params: Promise.resolve({ id }) })
const jsonPatch = (body: unknown, id = "a1") =>
  PATCH(
    new Request(`http://localhost/api/articles/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx(id),
  )
const formPatch = (fields: Record<string, string | File>) => {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  return PATCH(new Request("http://localhost/api/articles/a1", { method: "PATCH", body: form }), ctx())
}

const draft = {
  id: "a1",
  profileId: "p1",
  slug: "guarda",
  title: "Guarda compartilhada",
  excerpt: null,
  content: "<p>Texto informativo.</p>",
  coverImageUrl: null,
  status: "draft",
  publishedAt: null,
  metaDescription: null,
}
const lastData = () => prismaMock.article.update.mock.calls.at(-1)![0].data

beforeEach(() => {
  vi.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  getActiveSiteIdMock.mockResolvedValue("p1")
  // First findFirst = ownership lookup; later ones (slug clash) return null by default.
  prismaMock.article.findFirst.mockReset()
  prismaMock.article.findFirst.mockResolvedValueOnce(draft).mockResolvedValue(null)
  prismaMock.article.update.mockImplementation(({ data }) => Promise.resolve({ ...draft, ...data }))
  prismaMock.article.deleteMany.mockResolvedValue({ count: 1 })
})

describe("GET /api/articles/[id]", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET(new Request("http://x"), ctx())).status).toBe(401)
  })

  it("returns the article of the active site", async () => {
    const res = await GET(new Request("http://x"), ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).article.id).toBe("a1")
    expect(prismaMock.article.findFirst).toHaveBeenCalledWith({ where: { id: "a1", profileId: "p1" } })
  })

  it("returns 404 for another site's article", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValue(null)
    expect((await GET(new Request("http://x"), ctx("other"))).status).toBe(404)
  })
})

describe("PATCH /api/articles/[id]", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await jsonPatch({ title: "X" })).status).toBe(401)
  })

  it("returns 404 without site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await jsonPatch({ title: "X" })).status).toBe(404)
  })

  it("returns 404 for another site's article", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValue(null)
    expect((await jsonPatch({ title: "X" }, "other")).status).toBe(404)
    expect(prismaMock.article.update).not.toHaveBeenCalled()
  })

  it("sanitizes content and saves plain-text fields", async () => {
    const res = await jsonPatch({
      title: " Novo título ",
      content: '<p onclick="x()">Oi</p><script>alert(1)</script><img src=x onerror=alert(1)>',
      excerpt: "<b>Resumo</b>",
      metaDescription: "",
    })
    expect(res.status).toBe(200)
    expect(lastData()).toMatchObject({ title: "Novo título", content: "<p>Oi</p>", excerpt: "Resumo", metaDescription: null })
    expect(prismaMock.article.update.mock.calls[0][0].where).toEqual({ id: "a1" })
  })

  it.each([
    [{ title: "" }],
    [{ title: "a".repeat(151) }],
    [{ slug: "Com Espaço" }],
    [{ slug: "a".repeat(81) }],
    [{ excerpt: "a".repeat(301) }],
    [{ metaDescription: "a".repeat(161) }],
    [{ content: "a".repeat(100_001) }],
    [{ status: "archived" }],
  ])("returns 400 for %j", async (body) => {
    expect((await jsonPatch(body)).status).toBe(400)
    expect(prismaMock.article.update).not.toHaveBeenCalled()
  })

  it("returns 409 when the slug is used by another article of the site", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValueOnce(draft).mockResolvedValueOnce({ id: "a2" })
    const res = await jsonPatch({ slug: "outro-artigo" })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe("Este endereço já está em uso")
    expect(prismaMock.article.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { profileId: "p1", slug: "outro-artigo", NOT: { id: "a1" } } }),
    )
  })

  it("maps a unique-constraint race to 409", async () => {
    prismaMock.article.update.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }))
    expect((await jsonPatch({ slug: "novo" })).status).toBe(409)
  })

  it("requires the review confirmation to publish", async () => {
    const res = await jsonPatch({ status: "published" })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Confirme que revisou o conteúdo antes de publicar")
  })

  it("rejects publishing an empty article", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValueOnce({ ...draft, content: "<p> </p>" })
    expect((await jsonPatch({ status: "published", reviewed: true })).status).toBe(400)
  })

  it("publishes with review and sets publishedAt once", async () => {
    const res = await jsonPatch({ status: "published", reviewed: true })
    expect(res.status).toBe(200)
    expect(lastData().status).toBe("published")
    expect(lastData().publishedAt).toBeInstanceOf(Date)
  })

  it("keeps the original publishedAt when republishing", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValueOnce({ ...draft, status: "draft", publishedAt: new Date("2026-01-01") })
    await jsonPatch({ status: "published", reviewed: true })
    expect(lastData()).not.toHaveProperty("publishedAt")
  })

  it("requires review when changing the text of a published article", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValueOnce({ ...draft, status: "published", publishedAt: new Date() })
    expect((await jsonPatch({ content: "<p>Novo texto</p>" })).status).toBe(400)
  })

  it("allows unpublishing without review", async () => {
    prismaMock.article.findFirst.mockReset().mockResolvedValueOnce({ ...draft, status: "published", publishedAt: new Date() })
    const res = await jsonPatch({ status: "draft" })
    expect(res.status).toBe(200)
    expect(lastData().status).toBe("draft")
  })

  it("accepts multipart with a cover upload and reviewed=\"true\"", async () => {
    const res = await formPatch({ title: "Com capa", status: "published", reviewed: "true", cover: pngFile() })
    expect(res.status).toBe(200)
    expect(uploadToS3Mock).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^coverArticles\/p1\.\d+\.a1\.png$/) }))
    expect(lastData()).toMatchObject({ title: "Com capa", status: "published", coverImageUrl: "https://s3.test/cover.png" })
  })

  it("rejects a spoofed cover image", async () => {
    const res = await formPatch({ cover: spoofedHtmlFile() })
    expect(res.status).toBe(400)
    expect(uploadToS3Mock).not.toHaveBeenCalled()
  })

  it("removes the cover", async () => {
    await formPatch({ removeCover: "true" })
    expect(lastData().coverImageUrl).toBeNull()
  })

  it("returns 415 for other content types", async () => {
    const res = await PATCH(new Request("http://localhost/api/articles/a1", { method: "PATCH", body: "x" }), ctx())
    expect(res.status).toBe(415)
  })
})

describe("DELETE /api/articles/[id]", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await DELETE(new Request("http://x"), ctx())).status).toBe(401)
  })

  it("deletes scoped to the active site", async () => {
    expect((await DELETE(new Request("http://x"), ctx())).status).toBe(200)
    expect(prismaMock.article.deleteMany).toHaveBeenCalledWith({ where: { id: "a1", profileId: "p1" } })
  })

  it("returns 404 for another site's article", async () => {
    prismaMock.article.deleteMany.mockResolvedValue({ count: 0 })
    expect((await DELETE(new Request("http://x"), ctx("other"))).status).toBe(404)
  })
})
