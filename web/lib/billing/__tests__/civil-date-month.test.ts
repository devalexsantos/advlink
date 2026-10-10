import { describe, it, expect } from "vitest"
import { previousMonthRange, monthBefore, saoPauloDayOfMonth } from "../civil-date"

describe("previousMonthRange", () => {
  it("returns September for an October instant", () => {
    const r = previousMonthRange(new Date("2026-10-02T12:00:00Z"))
    expect(r.key).toBe("2026-09")
    expect(r.monthName).toBe("setembro")
    expect(r.from.toISOString()).toBe("2026-09-01T03:00:00.000Z")
    expect(r.to.toISOString()).toBe("2026-10-01T03:00:00.000Z")
  })

  it("January goes back to December of the previous year", () => {
    const r = previousMonthRange(new Date("2027-01-01T12:00:00Z"))
    expect(r.key).toBe("2026-12")
    expect(r.monthName).toBe("dezembro")
    expect(r.from.toISOString()).toBe("2026-12-01T03:00:00.000Z")
    expect(r.to.toISOString()).toBe("2027-01-01T03:00:00.000Z")
  })

  it("uses São Paulo time near midnight UTC", () => {
    // 01:00 UTC on Oct 1 is still Sep 30 in São Paulo -> previous month is August
    expect(previousMonthRange(new Date("2026-10-01T01:00:00Z")).key).toBe("2026-08")
    // 03:00 UTC on Oct 1 is 00:00 in São Paulo -> September
    expect(previousMonthRange(new Date("2026-10-01T03:00:00Z")).key).toBe("2026-09")
  })

  it("monthBefore chains correctly across years", () => {
    const r = monthBefore(previousMonthRange(new Date("2027-01-02T12:00:00Z")))
    expect(r.key).toBe("2026-11")
    expect(r.monthName).toBe("novembro")
  })
})

describe("saoPauloDayOfMonth", () => {
  it("uses the São Paulo calendar day", () => {
    expect(saoPauloDayOfMonth(new Date("2026-10-01T02:59:00Z"))).toBe(30)
    expect(saoPauloDayOfMonth(new Date("2026-10-01T03:00:00Z"))).toBe(1)
    expect(saoPauloDayOfMonth(new Date("2026-10-04T02:00:00Z"))).toBe(3)
  })
})
