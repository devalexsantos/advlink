// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { headersMock, prismaMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
  prismaMock: { profile: { findMany: vi.fn() }, customDomain: { findUnique: vi.fn() } },
}))

vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { clearCustomHostCache } from "@/lib/custom-domain"

function withHost(host: string) {
  headersMock.mockResolvedValue(new Headers({ host }))
}

describe("robots.txt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
    vi.stubEnv("NEXTAUTH_URL", "")
    vi.stubEnv("DEV_ALLOWED_ORIGINS", "")
    prismaMock.customDomain.findUnique.mockResolvedValue(null)
    clearCustomHostCache()
  })

  it("allows crawling on a profile subdomain and points to the sitemap", async () => {
    withHost("joao.advlink.site")
    const r = await robots()
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" })
    expect(r.sitemap).toBe("https://app.advlink.site/sitemap.xml")
  })

  it("blocks the app host except the legal page", async () => {
    withHost("app.advlink.site")
    const r = await robots()
    expect(r.rules).toEqual({ userAgent: "*", allow: "/termos-e-privacidade", disallow: "/" })
  })

  it("on a custom domain: profile rules and the domain's own sitemap", async () => {
    withHost("escritorio.adv.br")
    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "active", profileId: "p1", profile: { slug: "joao" } })
    const r = await robots()
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" })
    expect(r.sitemap).toBe("https://escritorio.adv.br/sitemap.xml")
  })

  it("on an unknown host: disallow everything", async () => {
    withHost("qualquer.com.br")
    const r = await robots()
    expect(r.rules).toEqual({ userAgent: "*", disallow: "/" })
    expect(r.sitemap).toBeUndefined()
  })
})

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
    vi.stubEnv("NEXTAUTH_URL", "")
    vi.stubEnv("DEV_ALLOWED_ORIGINS", "")
    prismaMock.customDomain.findUnique.mockResolvedValue(null)
    clearCustomHostCache()
  })

  it("lists only active, complete profiles on their subdomain", async () => {
    withHost("app.advlink.site")
    const updatedAt = new Date("2026-10-01T00:00:00Z")
    prismaMock.profile.findMany.mockResolvedValue([{ slug: "joao", updatedAt }])
    const entries = await sitemap()
    expect(prismaMock.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, setupComplete: true, slug: { not: null } } })
    )
    expect(entries).toContainEqual(expect.objectContaining({ url: "https://joao.advlink.site/", lastModified: updatedAt }))
    expect(entries[0].url).toBe("https://app.advlink.site/termos-e-privacidade")
    expect(entries.some((e) => e.url.includes("/artigos"))).toBe(false)
  })

  it("lists the published articles of each site and the articles index", async () => {
    withHost("app.advlink.site")
    const updatedAt = new Date("2026-10-01T00:00:00Z")
    const artUpdated = new Date("2026-10-05T00:00:00Z")
    prismaMock.profile.findMany.mockResolvedValue([
      { slug: "joao", updatedAt, articles: [{ slug: "direito-do-consumidor", updatedAt: artUpdated }] },
    ])
    const entries = await sitemap()
    const arg = prismaMock.profile.findMany.mock.calls[0][0]
    expect(arg.select.articles.where).toEqual({ status: "published" })
    expect(entries).toContainEqual(expect.objectContaining({ url: "https://joao.advlink.site/artigos", lastModified: artUpdated }))
    expect(entries).toContainEqual(
      expect.objectContaining({ url: "https://joao.advlink.site/artigos/direito-do-consumidor", lastModified: artUpdated }),
    )
  })

  it("uses the active custom domain as the base of a site in the global list", async () => {
    withHost("app.advlink.site")
    const updatedAt = new Date("2026-10-01T00:00:00Z")
    prismaMock.profile.findMany.mockResolvedValue([
      { slug: "joao", updatedAt, customDomain: { host: "escritorio.adv.br", status: "active" }, articles: [] },
      { slug: "maria", updatedAt, customDomain: { host: "maria.com.br", status: "provisioning" }, articles: [] },
    ])
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain("https://escritorio.adv.br/")
    expect(urls).toContain("https://maria.advlink.site/")
    expect(urls).not.toContain("https://joao.advlink.site/")
  })

  it("on a profile subdomain: only that site's URLs", async () => {
    withHost("joao.advlink.site")
    const updatedAt = new Date("2026-10-01T00:00:00Z")
    prismaMock.profile.findMany.mockResolvedValue([
      { slug: "joao", updatedAt, customDomain: null, articles: [{ slug: "a1", updatedAt }] },
    ])
    const entries = await sitemap()
    const arg = prismaMock.profile.findMany.mock.calls[0][0]
    expect(arg.where).toEqual({ isActive: true, setupComplete: true, slug: { not: null }, AND: [{ slug: "joao" }] })
    expect(arg.take).toBe(1)
    expect(entries.map((e) => e.url)).toEqual([
      "https://joao.advlink.site/",
      "https://joao.advlink.site/artigos",
      "https://joao.advlink.site/artigos/a1",
    ])
  })

  it("on a custom domain: only that site's URLs on the domain", async () => {
    withHost("escritorio.adv.br")
    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "active", profileId: "p1", profile: { slug: "joao" } })
    const updatedAt = new Date("2026-10-01T00:00:00Z")
    prismaMock.profile.findMany.mockResolvedValue([
      { slug: "joao", updatedAt, customDomain: { host: "escritorio.adv.br", status: "active" }, articles: [] },
    ])
    const entries = await sitemap()
    expect(prismaMock.profile.findMany.mock.calls[0][0].where.AND).toEqual([{ id: "p1" }])
    expect(entries.map((e) => e.url)).toEqual(["https://escritorio.adv.br/"])
  })

  it("on an unknown host: empty sitemap", async () => {
    withHost("qualquer.com.br")
    expect(await sitemap()).toEqual([])
    expect(prismaMock.profile.findMany).not.toHaveBeenCalled()
  })
})
