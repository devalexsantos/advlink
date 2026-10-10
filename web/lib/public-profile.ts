import type { Profile, Address } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { HOME_ARTICLES_LIMIT, listPublishedArticles } from "@/lib/articles"
import { activeHostOf, getSiteUrl } from "@/lib/site-url"

export type PublicProfileWhere = { slug: string } | { id: string }

export type PublicProfileRecord = Profile & {
  address: Address | null
  customDomain?: { host: string; status: string } | null
}

/** The profile row (with address and custom domain) behind a public page, or null. */
export function findPublicProfile(where: PublicProfileWhere): Promise<PublicProfileRecord | null> {
  return prisma.profile.findFirst({
    where,
    include: { address: true, customDomain: { select: { host: true, status: true } } },
  })
}

/** Host of the profile's custom domain when active (canonical host of the site), else null. */
export function publicCustomHost(profile: Pick<PublicProfileRecord, "customDomain">): string | null {
  return activeHostOf(profile.customDomain)
}

/** Canonical public URL of a loaded profile (custom domain when active, else the subdomain). */
export function publicSiteUrl(profile: Pick<PublicProfileRecord, "customDomain">, slug: string): string {
  return getSiteUrl({ slug, customDomainHost: publicCustomHost(profile) })
}

const byPosition = [{ position: "asc" as const }, { createdAt: "asc" as const }]

/** Everything a theme renders besides the profile row, in the editor's order. */
export async function loadPublicProfileRelations(profileId: string) {
  const [areas, links, gallery, customSections, teamMembers, articles] = await Promise.all([
    prisma.activityAreas.findMany({
      where: { profileId },
      orderBy: byPosition,
      include: { faqs: { orderBy: { position: "asc" }, select: { id: true, question: true, answer: true, position: true } } },
    }),
    prisma.links.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.gallery.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.customSection.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.teamMember.findMany({ where: { profileId }, orderBy: byPosition }),
    listPublishedArticles(profileId, { take: HOME_ARTICLES_LIMIT }),
  ])
  return { areas, links, gallery, customSections, teamMembers, articles }
}

export type PublicProfileData = { profile: PublicProfileRecord } & Awaited<ReturnType<typeof loadPublicProfileRelations>>

/**
 * Loads a profile and all the data its public page renders. Does NOT check publication
 * (`isActive`) — callers decide (the public page shows an inactive notice; the preview ignores it).
 */
export async function loadPublicProfile(where: PublicProfileWhere): Promise<PublicProfileData | null> {
  const profile = await findPublicProfile(where)
  if (!profile) return null
  return { profile, ...(await loadPublicProfileRelations(profile.id)) }
}
