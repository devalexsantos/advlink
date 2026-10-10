import type { PrismaClient } from "@prisma/client"
import { CONTACT_KINDS, isContactKind, type ContactKind } from "@/lib/contact-clicks"

export interface SiteSummary {
  visits: number
  visitors: number
  contactClicks: { total: number; byKind: Record<ContactKind, number> }
  topCities: { city: string; region: string | null; count: number }[]
  topSources: { source: string; count: number }[]
}

type Db = Pick<PrismaClient, "pageView" | "contactClick" | "$queryRaw">

/** Aggregated numbers for one site in [from, to). Aggregates only (LGPD). */
export async function getSiteSummary(
  prisma: Db,
  profileId: string,
  { from, to }: { from: Date; to: Date },
): Promise<SiteSummary> {
  const where = { profileId, createdAt: { gte: from, lt: to } }

  const [visits, uniqueResult, contactRows, cityRows, sourceRows] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT visitor_hash) as count
      FROM "PageView"
      WHERE "profileId" = ${profileId} AND "createdAt" >= ${from} AND "createdAt" < ${to}
    `,
    prisma.contactClick.groupBy({ by: ["kind"], where, _count: true }),
    prisma.pageView.groupBy({
      by: ["city", "region"],
      where: { ...where, city: { not: null } },
      _count: true,
      orderBy: { _count: { city: "desc" } },
      take: 3,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where,
      _count: true,
      orderBy: { _count: { referrer: "desc" } },
      take: 3,
    }),
  ])

  const byKind = Object.fromEntries(CONTACT_KINDS.map((k) => [k, 0])) as Record<ContactKind, number>
  for (const row of contactRows) {
    if (isContactKind(row.kind)) byKind[row.kind] = row._count
  }

  return {
    visits,
    visitors: Number(uniqueResult[0]?.count ?? 0),
    contactClicks: { total: CONTACT_KINDS.reduce((s, k) => s + byKind[k], 0), byKind },
    topCities: cityRows
      .filter((c) => c.city)
      .slice(0, 3)
      .map((c) => ({ city: c.city as string, region: c.region ?? null, count: c._count })),
    topSources: sourceRows.map((s) => ({ source: s.referrer || "Direto", count: s._count })),
  }
}
