import { describe, expect, it } from "vitest"
import { parseCivilDate as d } from "@/lib/billing/civil-date"
import { decideBillingStatus, transitionEffects, type BillingInputs } from "@/lib/billing/status"

const base: BillingInputs = {
  entitlement: { state: "NONE", coveredUntil: null, graceUntil: null },
  hasOpenSubscription: false,
  hasPendingCheckout: false,
  hasHistory: false,
  today: d("2026-11-20"),
}
const ent = (state: "PAID" | "GRACE" | "EXPIRED", graceUntil = "2026-11-10") => ({
  state,
  coveredUntil: d("2026-11-05"),
  graceUntil: d(graceUntil),
})

describe("decideBillingStatus", () => {
  it("NONE when nothing ever happened; PENDING after checkout started", () => {
    expect(decideBillingStatus(base).status).toBe("NONE")
    expect(decideBillingStatus({ ...base, hasPendingCheckout: true }).status).toBe("PENDING")
    expect(decideBillingStatus({ ...base, hasOpenSubscription: true }).status).toBe("PENDING")
  })

  it("ACTIVE while paid, also after the lawyer canceled (until the paid period ends)", () => {
    expect(decideBillingStatus({ ...base, entitlement: ent("PAID"), hasOpenSubscription: true }).status).toBe("ACTIVE")
    expect(decideBillingStatus({ ...base, entitlement: ent("PAID"), hasOpenSubscription: false }).status).toBe("ACTIVE")
  })

  it("GRACE only while the subscription is open; a canceled one ends at the paid period", () => {
    expect(decideBillingStatus({ ...base, entitlement: ent("GRACE"), hasOpenSubscription: true }).status).toBe("GRACE")
    expect(decideBillingStatus({ ...base, entitlement: ent("GRACE"), hasOpenSubscription: false }).status).toBe("CANCELED")
  })

  it("SUSPENDED after grace, CANCELED with churn after 30 more days", () => {
    const open = { ...base, hasOpenSubscription: true }
    expect(decideBillingStatus({ ...open, entitlement: ent("EXPIRED"), today: d("2026-12-10") })).toEqual({ status: "SUSPENDED", churnNow: false })
    expect(decideBillingStatus({ ...open, entitlement: ent("EXPIRED"), today: d("2026-12-11") })).toEqual({ status: "CANCELED", churnNow: true })
    expect(decideBillingStatus({ ...base, entitlement: ent("EXPIRED") })).toEqual({ status: "CANCELED", churnNow: false })
  })

  it("CANCELED when everything was refunded", () => {
    expect(decideBillingStatus({ ...base, hasHistory: true }).status).toBe("CANCELED")
  })
})

describe("transitionEffects", () => {
  it("first activation publishes and sends the welcome e-mail", () => {
    expect(transitionEffects("PENDING", "ACTIVE")).toEqual({ events: ["subscription_started", "site_published"], notice: "activated" })
  })

  it("coming back after suspension is a reactivation", () => {
    expect(transitionEffects("SUSPENDED", "ACTIVE")).toEqual({ events: ["subscription_reactivated", "site_published"], notice: "reactivated" })
  })

  it("late payment, suspension and cancellation notify the lawyer", () => {
    expect(transitionEffects("ACTIVE", "GRACE").notice).toBe("overdue")
    expect(transitionEffects("GRACE", "SUSPENDED")).toEqual({ events: ["site_unpublished"], notice: "suspended" })
    expect(transitionEffects("ACTIVE", "CANCELED")).toEqual({ events: ["subscription_canceled", "site_unpublished"], notice: "canceled" })
  })

  it("no effects without a change, and recovering from grace is silent", () => {
    expect(transitionEffects("ACTIVE", "ACTIVE")).toEqual({ events: [], notice: null })
    expect(transitionEffects("GRACE", "ACTIVE")).toEqual({ events: ["payment_recovered"], notice: null })
    expect(transitionEffects("PENDING", "CANCELED").notice).toBeNull()
  })
})
