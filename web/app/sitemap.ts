import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { activeHostOf, getAppOrigin, getSiteUrl } from "@/lib/site-url"
import { resolveCustomHost } from "@/lib/custom-domain"
import { hostnameOf, isPlatformHost, profileSlugFromHost } from "@/lib/platform-host"

// Rendered on request: the DB isn't reachable at build time
export const dynamic = "force-dynamic"

type SiteFilter = { slug: string } | { id: string }

/**
 * On a custom domain or a profile subdomain: only that site's URLs, on its canonical base.
 * On the app host: the legal page plus every published site.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? ""

  let only: SiteFilter | null = null
  if (!isPlatformHost(host)) {
    const site = await resolveCustomHost(hostnameOf(host)).catch(() => null)
    if (!site) return []
    only = { id: site.profileId }
  } else {
    const slug = profileSlugFromHost(host)
    if (slug) only = { slug }
  }

  const profiles = await prisma.profile.findMany({
    where: { isActive: true, setupComplete: true, slug: { not: null }, ...(only ? { AND: [only] } : {}) },
    select: {
      slug: true,
      updatedAt: true,
      customDomain: { select: { host: true, status: true } },
      articles: {
        where: { status: "published" },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    ...(only ? { take: 1 } : {}),
  })

  const siteEntries = profiles.flatMap((p) => {
    const base = getSiteUrl({ slug: p.slug as string, customDomainHost: activeHostOf(p.customDomain) })
    const articles = p.articles ?? []
    const entries: MetadataRoute.Sitemap = [{ url: base, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 1 }]
    if (articles.length > 0) {
      entries.push({ url: `${base}artigos`, lastModified: articles[0].updatedAt, changeFrequency: "weekly", priority: 0.6 })
      for (const a of articles) {
        entries.push({ url: `${base}artigos/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.7 })
      }
    }
    return entries
  })

  if (only) return siteEntries
  return [{ url: `${getAppOrigin()}/termos-e-privacidade`, changeFrequency: "yearly", priority: 0.1 }, ...siteEntries]
}
