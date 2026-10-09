// Pure billing decisions (no I/O): Profile.billingStatus from the entitlement and the subscription
// state, and which product events / e-mails a status change triggers.
import type { BillingStatus } from "@prisma/client"
import { addDays, compareCivil, type CivilDate } from "./civil-date"
import type { Entitlement } from "./entitlement"

/** Days suspended (after the grace period) before the subscription is ended in Asaas. */
export const CHURN_AFTER_DAYS = 30

export interface BillingInputs {
  entitlement: Entitlement
  /** A subscription that is still open in Asaas (will keep generating charges). */
  hasOpenSubscription: boolean
  /** Checkout started (active payment link) or a charge waiting for payment / risk analysis. */
  hasPendingCheckout: boolean
  /** Any payment or subscription ever recorded for this site. */
  hasHistory: boolean
  today: CivilDate
}

export interface BillingDecision {
  status: BillingStatus
  /** 30 days suspended: end the subscription in Asaas now. */
  churnNow: boolean
}

export function decideBillingStatus(i: BillingInputs): BillingDecision {
  const { state, graceUntil } = i.entitlement
  if (state === "PAID") return { status: "ACTIVE", churnNow: false }
  if (state === "GRACE") {
    // Grace is for a late payment; if the lawyer canceled, nothing is coming
    return { status: i.hasOpenSubscription ? "GRACE" : "CANCELED", churnNow: false }
  }
  if (state === "EXPIRED") {
    if (!i.hasOpenSubscription) return { status: "CANCELED", churnNow: false }
    const churn = graceUntil !== null && compareCivil(i.today, addDays(graceUntil, CHURN_AFTER_DAYS)) > 0
    return churn ? { status: "CANCELED", churnNow: true } : { status: "SUSPENDED", churnNow: false }
  }
  // Nothing paid (or everything refunded)
  if (i.hasPendingCheckout || i.hasOpenSubscription) return { status: "PENDING", churnNow: false }
  return { status: i.hasHistory ? "CANCELED" : "NONE", churnNow: false }
}

export function isPublishedStatus(status: BillingStatus): boolean {
  return status === "ACTIVE" || status === "GRACE"
}

export type BillingNotice = "activated" | "reactivated" | "overdue" | "suspended" | "canceled"

export interface TransitionEffects {
  /** ProductEvent types to record (only on real transitions, so redeliveries don't duplicate them). */
  events: string[]
  /** E-mail to send to the lawyer, if any. */
  notice: BillingNotice | null
}

export function transitionEffects(from: BillingStatus, to: BillingStatus): TransitionEffects {
  if (from === to) return { events: [], notice: null }
  const wasPublished = isPublishedStatus(from)
  switch (to) {
    case "ACTIVE":
      if (from === "GRACE") return { events: ["payment_recovered"], notice: null }
      if (from === "NONE" || from === "PENDING") return { events: ["subscription_started", "site_published"], notice: "activated" }
      return { events: ["subscription_reactivated", "site_published"], notice: "reactivated" }
    case "GRACE":
      return { events: ["payment_overdue"], notice: "overdue" }
    case "SUSPENDED":
      return { events: ["site_unpublished"], notice: "suspended" }
    case "CANCELED":
      return { events: wasPublished ? ["subscription_canceled", "site_unpublished"] : ["subscription_canceled"], notice: from === "PENDING" ? null : "canceled" }
    default:
      return { events: [], notice: null }
  }
}
