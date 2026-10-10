import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getAppOrigin, getProfileUrl } from "@/lib/site-url"

// Rendered on request: the DB isn't reachable at build time
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await prisma.profile.findMany({
    where: { isActive: true, setupComplete: true, slug: { not: null } },
    select: {
      slug: true,
      updatedAt: true,
      articles: {
        where: { status: "published" },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return [
    { url: `${getAppOrigin()}/termos-e-privacidade`, changeFrequency: "yearly", priority: 0.1 },
    ...profiles.flatMap((p) => {
      const base = getProfileUrl(p.slug as string)
      const articles = p.articles ?? []
      const entries: MetadataRoute.Sitemap = [{ url: base, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 1 }]
      if (articles.length > 0) {
        entries.push({ url: `${base}artigos`, lastModified: articles[0].updatedAt, changeFrequency: "weekly", priority: 0.6 })
        for (const a of articles) {
          entries.push({ url: `${base}artigos/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.7 })
        }
      }
      return entries
    }),
  ]
}
