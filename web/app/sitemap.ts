import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getAppOrigin, getProfileUrl } from "@/lib/site-url"

// Rendered on request: the DB isn't reachable at build time
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await prisma.profile.findMany({
    where: { isActive: true, setupComplete: true, slug: { not: null } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  })

  return [
    { url: `${getAppOrigin()}/termos-e-privacidade`, changeFrequency: "yearly", priority: 0.1 },
    ...profiles.map((p) => ({
      url: getProfileUrl(p.slug as string),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ]
}
