// Asaas → local mirror → Profile billing status → effects. Idempotent and order-independent: every
// event just means "fetch the current state and recompute" (BIL-4). Ported from Escavador
// (apps/worker/src/billing/billing.ts), adapted to Prisma and AdvLink's Profile.
import type { BillingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { trackEvent } from "@/lib/product-events"
import type { AsaasApi, AsaasSubscription } from "./asaas-client"
import { civilDateOf, civilToDbDate, dbDateToCivil, parseCivilDate, type CivilDate } from "./civil-date"
import { computeEntitlement, isPaidStatus, REVOKED_STATUSES, type Entitlement } from "./entitlement"
import { decideBillingStatus, isPublishedStatus, transitionEffects, type BillingNotice } from "./status"

export interface BillingNotification {
  profileId: string
  notice: BillingNotice
  from: BillingStatus
  to: BillingStatus
  entitlement: Entitlement
  /** Invoice of the most recent unpaid charge (for overdue/suspended e-mails). */
  invoiceUrl: string | null
}

export interface BillingDeps {
  asaas: AsaasApi
  now?: () => Date
  notify?: (n: BillingNotification) => Promise<void>
  log?: Pick<Console, "info" | "warn" | "error">
}

/** Profile ids are cuids. Escavador (same Asaas account) uses UUIDs, so its events never match. */
const PROFILE_REF_RE = /^c[a-z0-9]{20,32}$/
/** Charges waiting for the lawyer / the card network. */
const AWAITING_STATUSES = new Set(["PENDING", "AWAITING_RISK_ANALYSIS", "APPROVED_BY_RISK_ANALYSIS", "AUTHORIZED", "OVERDUE"])

const cents = (v: number | undefined | null) => (v == null ? null : Math.round(v * 100))

export async function profileForReference(ref: string | null | undefined): Promise<string | null> {
  if (!ref || !PROFILE_REF_RE.test(ref)) return null
  const p = await prisma.profile.findUnique({ where: { id: ref }, select: { id: true } })
  return p?.id ?? null
}

async function upsertSubscription(deps: BillingDeps, s: AsaasSubscription, profileId: string) {
  const env = deps.asaas.environment
  const data = {
    profileId,
    asaasCustomerId: s.customer,
    billingType: s.billingType ?? null,
    valueCents: cents(s.value) ?? 0,
    status: s.deleted ? "DELETED" : s.status,
    nextDueDate: s.nextDueDate ?? null,
    syncedAt: new Date(),
  }
  await prisma.billingSubscription.upsert({
    where: { environment_asaasId: { environment: env, asaasId: s.id } },
    create: { environment: env, asaasId: s.id, ...data },
    update: data,
  })
}

/** Mirrors a payment (and its subscription). Returns the profile it belongs to, or null if foreign. */
export async function syncPayment(deps: BillingDeps, paymentId: string): Promise<string | null> {
  const p = await deps.asaas.getPayment(paymentId)
  const profileId = await profileForReference(p.externalReference)
  if (!profileId) return null
  const revoked = !!p.deleted || REVOKED_STATUSES.has(p.status)
  const env = deps.asaas.environment
  const data = {
    profileId,
    subscriptionAsaasId: p.subscription ?? null,
    billingType: p.billingType,
    valueCents: cents(p.value) ?? 0,
    netValueCents: cents(p.netValue),
    status: p.status,
    dueDate: p.dueDate,
    paymentDate: p.paymentDate ?? p.confirmedDate ?? null,
    revoked,
    invoiceUrl: p.invoiceUrl ?? null,
    syncedAt: new Date(),
  }
  await prisma.billingPayment.upsert({
    where: { environment_asaasId: { environment: env, asaasId: p.id } },
    create: { environment: env, asaasId: p.id, ...data },
    update: data,
  })
  if (p.subscription) {
    const s = await deps.asaas.getSubscription(p.subscription)
    // A refund/chargeback does not end the subscription in Asaas; without this the card is charged again next month
    if (revoked && s.status === "ACTIVE" && !s.deleted) {
      await deps.asaas.deleteSubscription(s.id)
      deps.log?.warn("[billing] cobrança estornada: assinatura cancelada no Asaas", { profileId, subscription: s.id, payment: p.id })
      s.status = "INACTIVE"
      s.deleted = true
    }
    await upsertSubscription(deps, s, profileId)
  }
  return profileId
}

export async function syncSubscription(deps: BillingDeps, subscriptionId: string): Promise<string | null> {
  const s = await deps.asaas.getSubscription(subscriptionId)
  const profileId = await profileForReference(s.externalReference)
  if (profileId) await upsertSubscription(deps, s, profileId)
  return profileId
}

/** Recomputes billing status and applies its effects. Safe to repeat. */
export async function recomputeProfile(deps: BillingDeps, profileId: string): Promise<BillingStatus | null> {
  const now = deps.now?.() ?? new Date()
  const today = civilDateOf(now)
  const env = deps.asaas.environment

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, billingStatus: true, suspendedByAdmin: true, isActive: true, churnedAt: true },
  })
  if (!profile) return null

  const [payments, subscriptions, activeLinks] = await Promise.all([
    prisma.billingPayment.findMany({ where: { profileId, environment: env } }),
    prisma.billingSubscription.findMany({ where: { profileId, environment: env } }),
    prisma.billingPaymentLink.findMany({ where: { profileId, environment: env, status: "ACTIVE" } }),
  ])

  // Legacy guard: a site published before Asaas (Stripe or manual) has no billing data — never touch it
  if (!payments.length && !subscriptions.length && !activeLinks.length && profile.billingStatus === "NONE") {
    return profile.billingStatus
  }

  const entitlement = computeEntitlement(
    payments.map((p) => ({ status: p.status, dueDate: parseCivilDate(p.dueDate), revoked: p.revoked })),
    today
  )
  let openSubs = subscriptions.filter((s) => s.status === "ACTIVE")
  const decision = decideBillingStatus({
    entitlement,
    hasOpenSubscription: openSubs.length > 0,
    hasPendingCheckout: activeLinks.length > 0 || payments.some((p) => !p.revoked && AWAITING_STATUSES.has(p.status)),
    hasHistory: payments.length > 0 || subscriptions.length > 0,
    today,
  })
  let status = decision.status

  if (isPublishedStatus(status)) {
    // Paid: close the checkout links (a link accepts payments until disabled — BIL-2)
    for (const link of activeLinks) {
      try {
        await deps.asaas.disablePaymentLink(link.asaasId)
      } catch (err) {
        deps.log?.error("[billing] falha ao desativar link", { profileId, link: link.asaasId, err: String(err) })
        continue
      }
      await prisma.billingPaymentLink.update({ where: { id: link.id }, data: { status: "CONSUMED", closedAt: now } })
    }
    // A second subscription opened through the link but never paid (e.g. boleto generated, then paid by card):
    // end it so the lawyer isn't billed twice
    const paidSubIds = new Set(payments.filter((p) => !p.revoked && isPaidStatus(p.status)).map((p) => p.subscriptionAsaasId))
    for (const sub of openSubs.filter((s) => !paidSubIds.has(s.asaasId))) {
      await deps.asaas.deleteSubscription(sub.asaasId)
      await prisma.billingSubscription.update({ where: { id: sub.id }, data: { status: "DELETED", canceledAt: now, cancelReason: "duplicada" } })
      deps.log?.warn("[billing] assinatura duplicada sem pagamento cancelada", { profileId, subscription: sub.asaasId })
    }
    openSubs = openSubs.filter((s) => paidSubIds.has(s.asaasId))
  }

  if (decision.churnNow) {
    for (const sub of openSubs) {
      await deps.asaas.deleteSubscription(sub.asaasId)
      await prisma.billingSubscription.update({ where: { id: sub.id }, data: { status: "DELETED", canceledAt: now, cancelReason: "inadimplência (30 dias suspenso)" } })
    }
    deps.log?.warn("[billing] cliente encerrado: 30 dias sem pagamento", { profileId, canceled: openSubs.length })
    status = "CANCELED"
  }

  const published = isPublishedStatus(status) && !profile.suspendedByAdmin
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      billingStatus: status,
      paidUntil: civilToDbDate(entitlement.coveredUntil),
      graceUntil: civilToDbDate(entitlement.graceUntil),
      isActive: published,
      ...(decision.churnNow ? { churnedAt: now } : {}),
      ...(isPublishedStatus(status) && profile.churnedAt ? { churnedAt: null } : {}),
    },
  })

  const effects = transitionEffects(profile.billingStatus, status)
  for (const type of effects.events) {
    trackEvent(type, { userId: profile.userId, siteId: profileId, meta: { from: profile.billingStatus, to: status } }).catch(() => {})
  }
  if (effects.notice && deps.notify) {
    const unpaid = payments
      .filter((p) => !p.revoked && !isPaidStatus(p.status) && p.invoiceUrl)
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))[0]
    try {
      await deps.notify({ profileId, notice: effects.notice, from: profile.billingStatus, to: status, entitlement, invoiceUrl: unpaid?.invoiceUrl ?? null })
    } catch (err) {
      deps.log?.error("[billing] falha ao notificar", { profileId, notice: effects.notice, err: String(err) })
    }
  }
  if (profile.billingStatus !== status) {
    deps.log?.info("[billing] status alterado", { profileId, from: profile.billingStatus, to: status })
  }
  return status
}

/** Processes one stored webhook event (fetch-on-notify: the payload only says what to fetch). */
export async function processWebhookEvent(deps: BillingDeps, eventRowId: string): Promise<string> {
  const row = await prisma.webhookEvent.findUnique({ where: { id: eventRowId } })
  if (!row || row.processedAt) return "JA_PROCESSADO"
  try {
    const body = row.payload as { payment?: { id?: string }; subscription?: { id?: string } }
    let profileId: string | null = null
    if (body.payment?.id) profileId = await syncPayment(deps, body.payment.id)
    else if (body.subscription?.id) profileId = await syncSubscription(deps, body.subscription.id)
    const result = profileId ? ((await recomputeProfile(deps, profileId)) ?? "SEM_PERFIL") : "IGNORADO_SEM_PERFIL"
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { processedAt: new Date(), result, error: null, attempts: { increment: 1 } } })
    return result
  } catch (err) {
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { error: String(err).slice(0, 1000), attempts: { increment: 1 } } })
    throw err
  }
}

/** Max retries for a failing webhook event before the sweep gives up on it (it stays visible in the DB). */
const MAX_EVENT_ATTEMPTS = 10

/**
 * Periodic sweep: (1) retries unprocessed webhook events; (2) recomputes every site with billing data,
 * so grace periods and suspensions happen even without a webhook.
 */
export async function billingSweep(deps: BillingDeps): Promise<{ retried: number; recomputed: number; failed: number }> {
  const pending = await prisma.webhookEvent.findMany({
    where: { processedAt: null, attempts: { lt: MAX_EVENT_ATTEMPTS } },
    orderBy: { receivedAt: "asc" },
    take: 200,
    select: { id: true },
  })
  let failed = 0
  for (const e of pending) {
    try {
      await processWebhookEvent(deps, e.id)
    } catch {
      failed++
    }
  }
  const profiles = await prisma.profile.findMany({
    where: { billingStatus: { in: ["PENDING", "ACTIVE", "GRACE", "SUSPENDED"] } },
    select: { id: true },
  })
  for (const p of profiles) {
    try {
      await recomputeProfile(deps, p.id)
    } catch (err) {
      failed++
      deps.log?.error("[billing] falha ao recalcular", { profileId: p.id, err: String(err) })
    }
  }
  return { retried: pending.length, recomputed: profiles.length, failed }
}

export { dbDateToCivil }
export type { CivilDate }
