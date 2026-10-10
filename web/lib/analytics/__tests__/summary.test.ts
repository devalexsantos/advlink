// @vitest-environment node
import { describe, it, expect, vi } from "vitest"
import { getSiteSummary } from "../summary"

const range = { from: new Date("2026-09-01T03:00:00Z"), to: new Date("2026-10-01T03:00:00Z") }

function mk(over: Record<string, unknown> = {}) {
  return {
    pageView: {
      count: vi.fn().mockResolvedValue(120),
      groupBy: vi
        .fn()
        .mockResolvedValueOnce([
          { city: "São Paulo", region: "SP", _count: 50 },
          { city: "Campinas", region: null, _count: 10 },
        ])
        .mockResolvedValueOnce([
          { referrer: "Google", _count: 70 },
          { referrer: null, _count: 30 },
        ]),
    },
    contactClick: {
      groupBy: vi.fn().mockResolvedValue([
        { kind: "whatsapp", _count: 7 },
        { kind: "email", _count: 2 },
        { kind: "bogus", _count: 9 },
      ]),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(80) }]),
    ...over,
  }
}

describe("getSiteSummary", () => {
  it("aggregates visits, visitors, contacts, cities and sources", async () => {
    const db = mk()
    const s = await getSiteSummary(db as never, "p1", range)
    expect(s.visits).toBe(120)
    expect(s.visitors).toBe(80)
    expect(s.contactClicks).toEqual({ total: 9, byKind: { whatsapp: 7, phone: 0, email: 2, link: 0 } })
    expect(s.topCities).toEqual([
      { city: "São Paulo", region: "SP", count: 50 },
      { city: "Campinas", region: null, count: 10 },
    ])
    expect(s.topSources).toEqual([
      { source: "Google", count: 70 },
      { source: "Direto", count: 30 },
    ])
  })

  it("scopes by profileId and half-open range", async () => {
    const db = mk()
    await getSiteSummary(db as never, "p1", range)
    expect(db.pageView.count).toHaveBeenCalledWith({
      where: { profileId: "p1", createdAt: { gte: range.from, lt: range.to } },
    })
    expect(db.pageView.groupBy.mock.calls[0][0].where.city).toEqual({ not: null })
  })

  it("handles empty data", async () => {
    const db = mk({
      pageView: { count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) },
      contactClick: { groupBy: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn().mockResolvedValue([]),
    })
    const s = await getSiteSummary(db as never, "p1", range)
    expect(s.visits).toBe(0)
    expect(s.visitors).toBe(0)
    expect(s.contactClicks.total).toBe(0)
    expect(s.topCities).toEqual([])
  })
})
