import type { PrismaClient } from "@prisma/client"
import { getSiteSummary, type SiteSummary } from "@/lib/analytics/summary"
import { monthBefore, previousMonthRange, saoPauloDayOfMonth } from "@/lib/billing/civil-date"
import { DEFAULT_BATCH_LIMIT } from "./drip"

export interface MonthlyReportRecipient {
  userId: string
  email: string
  name: string | null
  siteId: string
  siteName: string
  siteSlug: string
  /** Active custom domain, used as the site URL when present. */
  siteHost?: string | null
  monthKey: string
  monthName: string
  previousMonthName: string
  summary: SiteSummary
  previousVisits: number
}

export type MonthlyReportSend = (recipient: MonthlyReportRecipient) => Promise<void>
export interface MonthlyReportCounts {
  sent: number
  skipped: number
  failed: number
}

interface RunOptions {
  now: Date
  prisma: Pick<PrismaClient, "profile" | "emailSend" | "pageView" | "contactClick" | "$queryRaw">
  send: MonthlyReportSend
  limit?: number
}

/** The report is only sent on days 1-3 (São Paulo) so late runs never mail stale numbers. */
const SEND_DAYS = [1, 3] as const
/** Max candidate sites loaded per run; idempotent, so later hourly runs pick up the rest. */
const CANDIDATE_CAP = 1000

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002"
}

/** Sends the monthly report (previous month) once per published site. */
export async function runMonthlyReports({
  now,
  prisma,
  send,
  limit = DEFAULT_BATCH_LIMIT,
}: RunOptions): Promise<MonthlyReportCounts> {
  const counts: MonthlyReportCounts = { sent: 0, skipped: 0, failed: 0 }
  const day = saoPauloDayOfMonth(now)
  if (day < SEND_DAYS[0] || day > SEND_DAYS[1]) return counts

  const range = previousMonthRange(now)
  const before = monthBefore(range)
  const prefix = `monthly:${range.key}:`

  const already = await prisma.emailSend.findMany({
    where: { kind: { startsWith: prefix } },
    select: { siteId: true },
  })
  const sentSiteIds = already.map((r) => r.siteId).filter((id): id is string => !!id)

  const profiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      slug: { not: null },
      firstPublishedAt: { lt: range.to },
      ...(sentSiteIds.length > 0 ? { id: { notIn: sentSiteIds } } : {}),
      user: { email: { not: null }, marketingEmailsOptOutAt: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: { select: { host: true, status: true } },
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { id: "asc" },
    take: CANDIDATE_CAP,
  })

  let attempts = 0
  for (const profile of profiles) {
    if (attempts >= limit) break
    const email = profile.user.email
    if (!email || !profile.slug) continue

    const summary = await getSiteSummary(prisma, profile.id, range)
    if (summary.visits === 0 && summary.contactClicks.total === 0) {
      counts.skipped++
      continue
    }
    const previousVisits = await prisma.pageView.count({
      where: { profileId: profile.id, createdAt: { gte: before.from, lt: before.to } },
    })

    attempts++
    const kind = `${prefix}${profile.id}`
    let recordId: string
    try {
      const rec = await prisma.emailSend.create({
        data: { userId: profile.user.id, kind, siteId: profile.id },
        select: { id: true },
      })
      recordId = rec.id
    } catch (e) {
      if (isUniqueViolation(e)) {
        counts.skipped++
        continue
      }
      throw e
    }
    try {
      await send({
        userId: profile.user.id,
        email,
        name: profile.user.name,
        siteId: profile.id,
        siteName: profile.name?.trim() || profile.slug,
        siteSlug: profile.slug,
        siteHost: profile.customDomain?.status === "active" ? profile.customDomain.host : null,
        monthKey: range.key,
        monthName: range.monthName,
        previousMonthName: before.monthName,
        summary,
        previousVisits,
      })
      counts.sent++
    } catch (e) {
      console.error("[monthly-report] falha ao enviar", profile.id, e)
      counts.failed++
      await prisma.emailSend.delete({ where: { id: recordId } }).catch(console.error)
    }
  }
  return counts
}
