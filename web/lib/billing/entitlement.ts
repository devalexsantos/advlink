// Access right of a paid site: pure function over the mirrored charges. Order-independent: it only
// looks at the current state of each charge. Ported from Escavador (packages/core/src/entitlement.ts).
import { addDays, compareCivil, type CivilDate } from "./civil-date"
import { normalizeCycle, PLANS } from "./plan"

/** Days the site stays published after the paid period ends (decision 2026-10-09). */
export const BILLING_GRACE_DAYS = 5

/** CONFIRMED = card approved; RECEIVED* = money in the account (Pix/boleto go straight to RECEIVED). */
const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"])

/** Asaas statuses in which a charge stops counting (refund, chargeback). */
export const REVOKED_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
])

export interface EntitlementPayment {
  status: string
  dueDate: CivilDate
  /** Cycle of the subscription that generated the charge (MONTHLY when missing): how long it covers. */
  cycle?: string | null
  /** Refunded, charged back or deleted: covers nothing. */
  revoked: boolean
}

export type EntitlementState = "NONE" | "PAID" | "GRACE" | "EXPIRED"

export interface Entitlement {
  state: EntitlementState
  /** Last day covered by what was paid (inclusive). */
  coveredUntil: CivilDate | null
  /** Last day of the grace period (inclusive). */
  graceUntil: CivilDate | null
}

/** Same day `months` months later; when it doesn't exist (31/01 + 1, 29/02 + 12) the last day of that month, like Asaas. */
export function addMonths(date: CivilDate, months: number): CivilDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  // m is 1-based: day 0 of 0-based month (m + months) is the last day of the target month
  const last = new Date(Date.UTC(y, m + months, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10) as CivilDate
}

/** Same day next month; when it doesn't exist (31/01) the last day of the month, like Asaas. */
export function addOneMonth(date: CivilDate): CivilDate {
  return addMonths(date, 1)
}

export function isPaidStatus(status: string): boolean {
  return PAID.has(status)
}

/** Each paid charge covers [dueDate, dueDate + 1 month) — or + 12 months for a yearly charge. */
export function computeEntitlement(payments: EntitlementPayment[], today: CivilDate, graceDays = BILLING_GRACE_DAYS): Entitlement {
  let coveredUntil: CivilDate | null = null
  for (const p of payments) {
    if (p.revoked || !PAID.has(p.status)) continue
    const end = addDays(addMonths(p.dueDate, PLANS[normalizeCycle(p.cycle)].months), -1)
    if (!coveredUntil || compareCivil(end, coveredUntil) > 0) coveredUntil = end
  }
  if (!coveredUntil) return { state: "NONE", coveredUntil: null, graceUntil: null }
  const graceUntil = addDays(coveredUntil, graceDays)
  const state = compareCivil(today, coveredUntil) <= 0 ? "PAID" : compareCivil(today, graceUntil) <= 0 ? "GRACE" : "EXPIRED"
  return { state, coveredUntil, graceUntil }
}
