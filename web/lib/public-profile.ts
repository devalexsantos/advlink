import type { Profile, Address } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type PublicProfileWhere = { slug: string } | { id: string }

export type PublicProfileRecord = Profile & { address: Address | null }

/** The profile row (with address) behind a public page, or null. */
export function findPublicProfile(where: PublicProfileWhere): Promise<PublicProfileRecord | null> {
  return prisma.profile.findFirst({ where, include: { address: true } })
}

const byPosition = [{ position: "asc" as const }, { createdAt: "asc" as const }]

/** Everything a theme renders besides the profile row, in the editor's order. */
export async function loadPublicProfileRelations(profileId: string) {
  const [areas, links, gallery, customSections, teamMembers] = await Promise.all([
    prisma.activityAreas.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.links.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.gallery.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.customSection.findMany({ where: { profileId }, orderBy: byPosition }),
    prisma.teamMember.findMany({ where: { profileId }, orderBy: byPosition }),
  ])
  return { areas, links, gallery, customSections, teamMembers }
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
