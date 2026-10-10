import { describe, expect, it } from "vitest"
import { parseCivilDate as d, civilDateOf, addDays } from "@/lib/billing/civil-date"
import { addMonths, addOneMonth, computeEntitlement, type EntitlementPayment } from "@/lib/billing/entitlement"

const pay = (dueDate: string, status = "CONFIRMED", revoked = false): EntitlementPayment => ({ dueDate: d(dueDate), status, revoked })

describe("civil dates", () => {
  it("uses the São Paulo calendar day", () => {
    expect(civilDateOf(new Date("2026-10-10T02:30:00Z"))).toBe("2026-10-09")
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01")
  })

  it("rejects invalid dates", () => {
    expect(() => d("2026-02-30")).toThrow()
    expect(() => d("10/10/2026")).toThrow()
  })
})

describe("addOneMonth", () => {
  it("same day next month, clamped to the month end like Asaas", () => {
    expect(addOneMonth(d("2026-10-06"))).toBe("2026-11-06")
    expect(addOneMonth(d("2026-12-15"))).toBe("2027-01-15")
    expect(addOneMonth(d("2027-01-31"))).toBe("2027-02-28")
    expect(addOneMonth(d("2028-01-31"))).toBe("2028-02-29")
  })
})

describe("computeEntitlement", () => {
  it("NONE without paid charges", () => {
    expect(computeEntitlement([], d("2026-10-06")).state).toBe("NONE")
    expect(computeEntitlement([pay("2026-10-06", "PENDING"), pay("2026-10-06", "OVERDUE")], d("2026-10-06")).state).toBe("NONE")
  })

  it("a paid charge covers one month, then 5 grace days, then EXPIRED", () => {
    for (const status of ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]) {
      const ps = [pay("2026-10-06", status)]
      expect(computeEntitlement(ps, d("2026-10-06"))).toEqual({ state: "PAID", coveredUntil: "2026-11-05", graceUntil: "2026-11-10" })
      expect(computeEntitlement(ps, d("2026-11-05")).state).toBe("PAID")
      expect(computeEntitlement(ps, d("2026-11-06")).state).toBe("GRACE")
      expect(computeEntitlement(ps, d("2026-11-10")).state).toBe("GRACE")
      expect(computeEntitlement(ps, d("2026-11-11")).state).toBe("EXPIRED")
    }
  })

  it("the next paid charge extends coverage; an open one doesn't", () => {
    expect(computeEntitlement([pay("2026-10-06"), pay("2026-11-06", "PENDING")], d("2026-11-12")).state).toBe("EXPIRED")
    expect(computeEntitlement([pay("2026-10-06"), pay("2026-11-06", "RECEIVED")], d("2026-11-12"))).toMatchObject({ state: "PAID", coveredUntil: "2026-12-05" })
  })

  it("refunds and chargebacks cover nothing", () => {
    expect(computeEntitlement([pay("2026-10-06", "REFUNDED")], d("2026-10-07")).state).toBe("NONE")
    expect(computeEntitlement([pay("2026-10-06", "CONFIRMED", true)], d("2026-10-07")).state).toBe("NONE")
  })

  it("does not depend on the order of the charges (events out of order)", () => {
    const ps = [pay("2026-10-06"), pay("2026-11-06", "RECEIVED"), pay("2026-12-06", "PENDING"), pay("2026-09-01", "REFUNDED"), pay("2027-01-06", "OVERDUE")]
    const expected = computeEntitlement(ps, d("2026-12-20"))
    for (let i = 0; i < 30; i++) {
      expect(computeEntitlement([...ps].sort(() => Math.random() - 0.5), d("2026-12-20"))).toEqual(expected)
    }
  })
})

describe("yearly charges", () => {
  const yearly = (dueDate: string, status = "CONFIRMED"): EntitlementPayment => ({ dueDate: d(dueDate), status, revoked: false, cycle: "YEARLY" })

  it("addMonths(12) clamps 29/02 like Asaas", () => {
    expect(addMonths(d("2026-10-06"), 12)).toBe("2027-10-06")
    expect(addMonths(d("2028-02-29"), 12)).toBe("2029-02-28")
  })

  it("a paid yearly charge covers 12 months, then 5 grace days, then EXPIRED", () => {
    const ps = [yearly("2026-10-06")]
    expect(computeEntitlement(ps, d("2026-10-06"))).toEqual({ state: "PAID", coveredUntil: "2027-10-05", graceUntil: "2027-10-10" })
    expect(computeEntitlement(ps, d("2027-06-01")).state).toBe("PAID")
    expect(computeEntitlement(ps, d("2027-10-05")).state).toBe("PAID")
    expect(computeEntitlement(ps, d("2027-10-06")).state).toBe("GRACE")
    expect(computeEntitlement(ps, d("2027-10-10")).state).toBe("GRACE")
    expect(computeEntitlement(ps, d("2027-10-11")).state).toBe("EXPIRED")
  })

  it("missing or unknown cycle counts as monthly; a refunded yearly charge covers nothing", () => {
    expect(computeEntitlement([{ dueDate: d("2026-10-06"), status: "CONFIRMED", revoked: false, cycle: null }], d("2026-10-06")).coveredUntil).toBe("2026-11-05")
    expect(computeEntitlement([{ ...yearly("2026-10-06", "REFUNDED"), revoked: true }], d("2026-10-07")).state).toBe("NONE")
  })
})
