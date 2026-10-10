// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { runMonthlyReports } from "../monthly-report"

const NOW = new Date("2026-10-02T12:00:00Z")

const profile = (id = "p1", over = {}) => ({
  id,
  name: "Ana Advocacia",
  slug: `ana-${id}`,
  user: { id: `u-${id}`, email: `${id}@b.com`, name: "Ana" },
  ...over,
})

function setup(profiles = [profile()], opts: { visits?: number; clicks?: unknown[]; already?: { siteId: string }[] } = {}) {
  const { visits = 10, clicks = [], already = [] } = opts
  const prisma = {
    profile: { findMany: vi.fn().mockResolvedValue(profiles) },
    emailSend: {
      findMany: vi.fn().mockResolvedValue(already),
      create: vi.fn().mockResolvedValue({ id: "rec1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
    pageView: {
      count: vi.fn().mockResolvedValue(visits),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    contactClick: { groupBy: vi.fn().mockResolvedValue(clicks) },
    $queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(5) }]),
  }
  const send = vi.fn().mockResolvedValue(undefined)
  const run = (over: { now?: Date; limit?: number } = {}) =>
    runMonthlyReports({ now: over.now ?? NOW, prisma: prisma as never, send, limit: over.limit })
  return { prisma, send, run }
}

describe("runMonthlyReports", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it("does nothing outside days 1-3 (São Paulo) without querying", async () => {
    const { prisma, send, run } = setup()
    const counts = await run({ now: new Date("2026-10-04T12:00:00Z") })
    expect(counts).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(prisma.profile.findMany).not.toHaveBeenCalled()
    expect(prisma.emailSend.findMany).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("uses São Paulo day: Oct 4 01:00 UTC is still day 3", async () => {
    const { send, run } = setup()
    await run({ now: new Date("2026-10-04T02:00:00Z") })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("filters eligibility in the query (published, slug, opt-out, email)", async () => {
    const { prisma, run } = setup()
    await run()
    const where = prisma.profile.findMany.mock.calls[0][0].where
    expect(where.isActive).toBe(true)
    expect(where.slug).toEqual({ not: null })
    expect(where.firstPublishedAt).toEqual({ lt: new Date("2026-10-01T03:00:00Z") })
    expect(where.user).toEqual({ email: { not: null }, marketingEmailsOptOutAt: null })
  })

  it("sends with the previous month data and records first", async () => {
    const { prisma, send, run } = setup()
    const counts = await run()
    expect(counts.sent).toBe(1)
    expect(prisma.emailSend.create).toHaveBeenCalledWith({
      data: { userId: "u-p1", kind: "monthly:2026-09:p1", siteId: "p1" },
      select: { id: true },
    })
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "p1@b.com",
        siteId: "p1",
        monthKey: "2026-09",
        monthName: "setembro",
        previousMonthName: "agosto",
        previousVisits: 10,
      }),
    )
    expect(prisma.pageView.count).toHaveBeenLastCalledWith({
      where: {
        profileId: "p1",
        createdAt: { gte: new Date("2026-08-01T03:00:00Z"), lt: new Date("2026-09-01T03:00:00Z") },
      },
    })
  })

  it("excludes sites already sent via pre-filter", async () => {
    const { prisma, run } = setup([profile()], { already: [{ siteId: "p9" }] })
    await run()
    expect(prisma.emailSend.findMany).toHaveBeenCalledWith({
      where: { kind: { startsWith: "monthly:2026-09:" } },
      select: { siteId: true },
    })
    expect(prisma.profile.findMany.mock.calls[0][0].where.id).toEqual({ notIn: ["p9"] })
  })

  it("skips sites with no visits and no contact clicks", async () => {
    const { prisma, send, run } = setup([profile()], { visits: 0 })
    const counts = await run()
    expect(counts).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(prisma.emailSend.create).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("sends when there are only contact clicks", async () => {
    const { send, run } = setup([profile()], { visits: 0, clicks: [{ kind: "whatsapp", _count: 2 }] })
    expect((await run()).sent).toBe(1)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("treats P2002 as already sent and does not send", async () => {
    const { prisma, send, run } = setup()
    prisma.emailSend.create.mockRejectedValue({ code: "P2002" })
    const counts = await run()
    expect(counts).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  it("rethrows other create errors", async () => {
    const { prisma, run } = setup()
    prisma.emailSend.create.mockRejectedValue(new Error("db down"))
    await expect(run()).rejects.toThrow("db down")
  })

  it("rolls back the record when sending fails", async () => {
    const { prisma, send, run } = setup()
    send.mockRejectedValue(new Error("resend"))
    const counts = await run()
    expect(counts).toEqual({ sent: 0, skipped: 0, failed: 1 })
    expect(prisma.emailSend.delete).toHaveBeenCalledWith({ where: { id: "rec1" } })
  })

  it("respects the limit", async () => {
    const { send, run } = setup([profile("a"), profile("b"), profile("c")])
    const counts = await run({ limit: 2 })
    expect(counts.sent).toBe(2)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it("in January reports December of the previous year", async () => {
    const { prisma, send, run } = setup()
    await run({ now: new Date("2027-01-02T12:00:00Z") })
    expect(prisma.emailSend.create.mock.calls[0][0].data.kind).toBe("monthly:2026-12:p1")
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ monthName: "dezembro", previousMonthName: "novembro" }))
  })
})
