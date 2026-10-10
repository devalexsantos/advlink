import { prisma } from "@/lib/prisma"
import { LEAD_RETENTION_DAYS } from "@/lib/leads"
import { getEasypanel } from "@/lib/easypanel"
import { checkHttps, clearCustomHostCache } from "@/lib/custom-domain"

const DAY_MS = 24 * 60 * 60 * 1000
const CUSTOM_DOMAIN_BATCH = 50

/** LGPD retention: contact-form messages older than LEAD_RETENTION_DAYS are deleted. */
export async function purgeExpiredLeads(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - LEAD_RETENTION_DAYS * DAY_MS)
  const { count } = await prisma.lead.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return count
}

export type CustomDomainMaintenanceResult = {
  domainsActivated: number
  domainsRemoved: number
  domainsChecked: number
}

/**
 * 1. Sites that are gone for good (billing CANCELED, or suspended by an admin) lose their domain on
 *    Easypanel; the row stays with status "error" so the lawyer can reconnect after resubscribing.
 * 2. Provisioning domains whose certificate is now live become active.
 * Up to CUSTOM_DOMAIN_BATCH domains per step; a failure on one domain doesn't stop the others.
 */
export async function maintainCustomDomains(now: Date = new Date()): Promise<CustomDomainMaintenanceResult> {
  const result: CustomDomainMaintenanceResult = { domainsActivated: 0, domainsRemoved: 0, domainsChecked: 0 }
  const easypanel = getEasypanel()
  if (!easypanel) return result

  const unpublished = await prisma.customDomain.findMany({
    where: {
      status: { in: ["active", "provisioning"] },
      profile: { OR: [{ billingStatus: "CANCELED" }, { suspendedByAdmin: true }] },
    },
    select: { id: true, host: true, easypanelDomainId: true },
    take: CUSTOM_DOMAIN_BATCH,
  })
  for (const d of unpublished) {
    try {
      if (d.easypanelDomainId) await easypanel.deleteDomain(d.easypanelDomainId)
      await prisma.customDomain.update({
        where: { id: d.id },
        data: { status: "error", error: "Site despublicado", easypanelDomainId: null, lastCheckedAt: now },
      })
      result.domainsRemoved++
    } catch (err) {
      console.error("[maintenance] remoção de domínio falhou", { host: d.host, error: (err as Error).message })
    }
  }

  const provisioning = await prisma.customDomain.findMany({
    where: { status: "provisioning", profile: { isActive: true } },
    select: { id: true, host: true, profileId: true },
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    take: CUSTOM_DOMAIN_BATCH,
  })
  for (const d of provisioning) {
    result.domainsChecked++
    try {
      const live = await checkHttps(d.host, d.profileId)
      await prisma.customDomain.update({
        where: { id: d.id },
        data: live ? { status: "active", error: null, activatedAt: now, lastCheckedAt: now } : { lastCheckedAt: now },
      })
      if (live) result.domainsActivated++
    } catch (err) {
      console.error("[maintenance] verificação de domínio falhou", { host: d.host, error: (err as Error).message })
    }
  }

  if (result.domainsRemoved || result.domainsActivated) clearCustomHostCache()
  return result
}

export type MaintenanceResult = { leadsPurged: number } & CustomDomainMaintenanceResult

/**
 * Hourly housekeeping (GET/POST /api/cron/maintenance). Each step returns counts that are merged
 * into the result; add new steps here with their own keys.
 */
export async function runMaintenance(now: Date = new Date()): Promise<MaintenanceResult> {
  const leadsPurged = await purgeExpiredLeads(now)
  const domains = await maintainCustomDomains(now)
  return { leadsPurged, ...domains }
}
