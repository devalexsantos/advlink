// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { profile: { findFirst: vi.fn() }, article: { findMany: vi.fn(), findFirst: vi.fn() } },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/components/analytics/ProfileTracker", () => ({ ProfileTracker: () => null }))
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

import ListPage, { generateMetadata as listMeta } from "../page"
import ArticlePage, { generateMetadata as articleMeta } from "../[articleSlug]/page"

const profile = { id: "p1", slug: "ana", isActive: true, publicName: "Ana", oabNumber: "123456", oabState: "SP", primaryColor: "#111", secondaryColor: "#eee", textColor: "#fff" }
const article = { id: "a1", slug: "meu-artigo", title: "Meu artigo", excerpt: "Resumo", content: "<p>Texto</p>", coverImageUrl: "https://img/c.jpg", status: "published", publishedAt: new Date("2026-03-05T12:00:00Z"), updatedAt: new Date("2026-03-06T12:00:00Z"), metaDescription: null }
const params = (articleSlug = "meu-artigo") => ({ params: Promise.resolve({ slug: "ana", articleSlug }) })

function flatten(node: unknown): string {
  return JSON.stringify(node, (_k, v) => (typeof v === "function" ? undefined : v))
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.profile.findFirst.mockResolvedValue({ ...profile, address: null })
  prismaMock.article.findFirst.mockResolvedValue(article)
  prismaMock.article.findMany.mockResolvedValue([article])
})

describe("article pages", () => {
  it("404 when profile is missing or inactive", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    await expect(ArticlePage(params())).rejects.toThrow("NEXT_NOT_FOUND")
    prismaMock.profile.findFirst.mockResolvedValue({ ...profile, isActive: false })
    await expect(ArticlePage(params())).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(ListPage({ params: Promise.resolve({ slug: "ana" }) })).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("404 when the article is not published", async () => {
    prismaMock.article.findFirst.mockResolvedValue(null)
    await expect(ArticlePage(params("x"))).rejects.toThrow("NEXT_NOT_FOUND")
    expect(prismaMock.article.findFirst.mock.calls[0][0].where).toMatchObject({ profileId: "p1", slug: "x", status: "published" })
  })

  it("renders the article with author, OAB, JSON-LD and back link", async () => {
    const out = flatten(await ArticlePage(params()))
    expect(out).toContain("Meu artigo")
    expect(out).toContain("OAB/SP 123.456")
    expect(out).toContain("BlogPosting")
  })

  it("lists only published articles", async () => {
    const out = flatten(await ListPage({ params: Promise.resolve({ slug: "ana" }) }))
    expect(prismaMock.article.findMany.mock.calls[0][0].where).toMatchObject({ profileId: "p1", status: "published" })
    expect(out).toContain("Meu artigo")
  })

  it("sets canonical, title and article OG metadata", async () => {
    const m = await articleMeta(params())
    expect(m.title).toBe("Meu artigo | Ana")
    expect(m.description).toBe("Resumo")
    expect(m.alternates?.canonical).toMatch(/^https?:\/\/ana\..+\/artigos\/meu-artigo$/)
    expect((m.openGraph as { type?: string }).type).toBe("article")
    const l = await listMeta({ params: Promise.resolve({ slug: "ana" }) })
    expect(l.alternates?.canonical).toMatch(/\/artigos$/)
  })
})
