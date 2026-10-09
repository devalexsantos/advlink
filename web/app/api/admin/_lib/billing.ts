// Shared billing queries for the admin API. Everything comes from the local Asaas mirror
// (Profile.billingStatus, BillingSubscription, BillingPayment) — never from the payment provider.
import type { BillingStatus, Prisma } from "@prisma/client"
import { civilDateOf } from "@/lib/billing/civil-date"
import { getBillingDeps } from "@/lib/billing/deps"
import type { BillingDeps } from "@/lib/billing/sync"

/** Billing states in which the site is paid for (published unless suspended by the team). */
export const PAID_BILLING_STATUSES: BillingStatus[] = ["ACTIVE", "GRACE"]

/** Adds `paidSites`: how many of the user's sites are paid for (billing ACTIVE|GRACE). */
export function withPaidSites<T extends { profiles?: { billingStatus: BillingStatus }[] | null }>(user: T): T & { paidSites: number } {
  const paidSites = (user.profiles ?? []).filter((p) => PAID_BILLING_STATUSES.includes(p.billingStatus)).length
  return { ...user, paidSites }
}

/** Asaas payment statuses that mean money received (same set as lib/billing/entitlement). */
export const PAID_PAYMENT_STATUSES = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]

/** Subscriptions ended by the system while the site keeps (or replaces) its plan: not churn. */
const NON_CHURN_CANCEL_REASONS = ["duplicada", "trocou a forma de pagamento"]

/** Billing deps, or null when Asaas isn't configured or is misconfigured (the admin must keep working). */
export function safeBillingDeps(): BillingDeps | null {
  try {
    return getBillingDeps()
  } catch (err) {
    console.error("[admin] cliente do Asaas mal configurado", String(err))
    return null
  }
}

/** Asaas environment of the configured client; rows from the other environment are ignored. */
export function billingEnvironment(): string {
  return safeBillingDeps()?.asaas.environment ?? "PRODUCTION"
}

/**
 * Sites that ended their subscription in the given range (lawyer cancel or 30-day churn) and have no
 * open subscription now. Excludes system cleanups (duplicate / payment method switch) and sites that
 * already subscribed again.
 */
export function canceledSitesWhere(environment: string, canceledAt: Prisma.DateTimeNullableFilter): Prisma.ProfileWhereInput {
  return {
    billingSubscriptions: {
      some: {
        environment,
        canceledAt,
        OR: [{ cancelReason: null }, { cancelReason: { notIn: NON_CHURN_CANCEL_REASONS } }],
      },
      none: { environment, status: "ACTIVE" },
    },
  }
}

/** First and last civil day ("YYYY-MM-DD") of the current month in São Paulo. */
export function currentMonthRange(now: Date): { first: string; last: string } {
  const [y, m] = civilDateOf(now).split("-").map(Number) as [number, number]
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, "0")
  return { first: `${y}-${mm}-01`, last: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` }
}
