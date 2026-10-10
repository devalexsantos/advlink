// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { headersMock, prismaMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
  prismaMock: { profile: { findMany: vi.fn() } },
}))

vi.mock("next/headers", () => ({ headers: headersMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import robots from "@/app/robots"
import sitemap from "@/app/sitemap"

function withHost(host: string) {
  headersMock.mockResolvedValue(new Headers({ host }))
}

describe("robots.txt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
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
})

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
  })

  it("lists only active, complete profiles on their subdomain", async () => {
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
})
