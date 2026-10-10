import { prisma } from "@/lib/prisma"
import { LEAD_RETENTION_DAYS } from "@/lib/leads"

const DAY_MS = 24 * 60 * 60 * 1000

/** LGPD retention: contact-form messages older than LEAD_RETENTION_DAYS are deleted. */
export async function purgeExpiredLeads(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - LEAD_RETENTION_DAYS * DAY_MS)
  const { count } = await prisma.lead.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return count
}

export type MaintenanceResult = {
  leadsPurged: number
}

/**
 * Hourly housekeeping (GET/POST /api/cron/maintenance). Each step returns a count that is merged
 * into the result; add new steps here (e.g. custom-domain verification) with their own key.
 */
export async function runMaintenance(now: Date = new Date()): Promise<MaintenanceResult> {
  const leadsPurged = await purgeExpiredLeads(now)
  return { leadsPurged }
}
