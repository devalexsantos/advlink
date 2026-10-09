// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { getAdminSessionMock, prismaMock, getBillingDepsMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    profile: { groupBy: vi.fn(), count: vi.fn() },
    billingSubscription: { aggregate: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    billingPayment: { aggregate: vi.fn() },
  },
  getBillingDepsMock: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/billing/deps", () => ({ getBillingDeps: getBillingDepsMock }))

import { GET } from "@/app/api/admin/financial/route"

const adminSession = { id: "admin-1", role: "admin" }

function get(query = "") {
  return GET(new Request(`http://localhost/api/admin/financial${query}`))
}

describe("GET /api/admin/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue(adminSession)
    getBillingDepsMock.mockReturnValue(null)
    prismaMock.profile.groupBy.mockResolvedValue([
      { billingStatus: "ACTIVE", _count: { _all: 5 } },
      { billingStatus: "GRACE", _count: { _all: 2 } },
      { billingStatus: "SUSPENDED", _count: { _all: 1 } },
      { billingStatus: "PENDING", _count: { _all: 4 } },
      { billingStatus: "NONE", _count: { _all: 30 } },
    ])
    prismaMock.profile.count.mockResolvedValue(3)
    prismaMock.billingSubscription.aggregate.mockResolvedValue({ _sum: { valueCents: 34300 } })
    prismaMock.billingPayment.aggregate.mockResolvedValue({
      _sum: { valueCents: 14700, netValueCents: 13900 },
      _count: { _all: 3 },
    })
    prismaMock.billingSubscription.findMany.mockResolvedValue([])
    prismaMock.billingSubscription.count.mockResolvedValue(0)
  })

  afterEach(() => vi.useRealTimers())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await get()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
    expect(prismaMock.profile.groupBy).not.toHaveBeenCalled()
  })

  it("counts sites per billing status (paying = ACTIVE + GRACE)", async () => {
    const res = await get()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.paying).toBe(7)
    expect(data.overdue).toBe(2)
    expect(data.delinquent).toBe(1)
    expect(data.pending).toBe(4)
    expect(data.recentlyCancelled).toBe(3)
    expect(data.mrrCents).toBe(34300)
    expect(data.monthRevenueCents).toBe(14700)
    expect(data.monthNetRevenueCents).toBe(13900)
    expect(data.monthPayments).toBe(3)
    expect(data.environment).toBe("PRODUCTION")
  })

  it("returns zeros when there is no billing data", async () => {
    prismaMock.profile.groupBy.mockResolvedValue([])
    prismaMock.profile.count.mockResolvedValue(0)
    prismaMock.billingSubscription.aggregate.mockResolvedValue({ _sum: { valueCents: null } })
    prismaMock.billingPayment.aggregate.mockResolvedValue({ _sum: { valueCents: null, netValueCents: null }, _count: { _all: 0 } })

    const data = await (await get()).json()

    expect(data).toMatchObject({ paying: 0, overdue: 0, delinquent: 0, recentlyCancelled: 0, mrrCents: 0, monthRevenueCents: 0 })
  })

  it("MRR sums ACTIVE subscriptions of paid sites in the configured environment", async () => {
    getBillingDepsMock.mockReturnValue({ asaas: { environment: "SANDBOX" } })
    await get()
    expect(prismaMock.billingSubscription.aggregate).toHaveBeenCalledWith({
      where: { environment: "SANDBOX", status: "ACTIVE", profile: { billingStatus: { in: ["ACTIVE", "GRACE"] } } },
      _sum: { valueCents: true },
    })
  })

  it("month revenue sums paid, non-revoked payments with paymentDate in the current month (São Paulo)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // 2026-11-01 01:00 UTC is still 2026-10-31 in São Paulo
    vi.setSystemTime(new Date("2026-11-01T01:00:00.000Z"))

    await get()

    const where = prismaMock.billingPayment.aggregate.mock.calls[0][0].where
    expect(where).toEqual({
      environment: "PRODUCTION",
      status: { in: ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"] },
      revoked: false,
      paymentDate: { gte: "2026-10-01", lte: "2026-10-31" },
    })
  })

  it("recently cancelled = sites with a churn cancellation in 30 days and no open subscription", async () => {
    await get()
    const where = prismaMock.profile.count.mock.calls[0][0].where
    const some = where.billingSubscriptions.some
    expect(some.environment).toBe("PRODUCTION")
    expect(some.canceledAt.gte).toBeInstanceOf(Date)
    expect(Math.abs(some.canceledAt.gte.getTime() - (Date.now() - 30 * 24 * 60 * 60 * 1000))).toBeLessThan(5000)
    expect(some.OR).toEqual([
      { cancelReason: null },
      { cancelReason: { notIn: ["duplicada", "trocou a forma de pagamento"] } },
    ])
    expect(where.billingSubscriptions.none).toEqual({ environment: "PRODUCTION", status: "ACTIVE" })
  })

  it("lists subscriptions of the environment with site, owner e-mail and pagination", async () => {
    const row = {
      id: "bs-1",
      status: "ACTIVE",
      valueCents: 4900,
      billingType: "PIX",
      nextDueDate: "2026-11-09",
      canceledAt: null,
      createdAt: new Date("2026-10-09T12:00:00Z"),
      profile: {
        id: "site-1",
        slug: "dr-silva",
        publicName: "Dr. Silva",
        name: null,
        billingStatus: "ACTIVE",
        paidUntil: new Date("2026-11-08T00:00:00Z"),
        suspendedByAdmin: false,
        user: { email: "silva@oab.com" },
      },
    }
    prismaMock.billingSubscription.findMany.mockResolvedValue([row])
    prismaMock.billingSubscription.count.mockResolvedValue(41)

    const data = await (await get("?page=3")).json()

    expect(data.subscriptions).toHaveLength(1)
    expect(data.subscriptions[0]).toMatchObject({ id: "bs-1", valueCents: 4900, profile: { slug: "dr-silva", user: { email: "silva@oab.com" } } })
    expect(data).toMatchObject({ total: 41, page: 3, perPage: 20 })
    const query = prismaMock.billingSubscription.findMany.mock.calls[0][0]
    expect(query.where).toEqual({ environment: "PRODUCTION" })
    expect(query.skip).toBe(40)
    expect(query.take).toBe(20)
    expect(query.select.profile.select.user).toEqual({ select: { email: true } })
  })

  it("falls back to page 1 for an invalid page param", async () => {
    const data = await (await get("?page=abc")).json()
    expect(data.page).toBe(1)
    expect(prismaMock.billingSubscription.findMany.mock.calls[0][0].skip).toBe(0)
  })

  it("defaults to PRODUCTION when the Asaas client is misconfigured", async () => {
    getBillingDepsMock.mockImplementation(() => {
      throw new Error("chave do Asaas não combina")
    })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const res = await get()
    expect(res.status).toBe(200)
    expect((await res.json()).environment).toBe("PRODUCTION")
    errorSpy.mockRestore()
  })
})
