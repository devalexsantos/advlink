// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getAdminSessionMock, getBillingDepsMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { count: vi.fn(), findMany: vi.fn() },
    profile: { count: vi.fn(), findMany: vi.fn() },
    ticket: { count: vi.fn(), findMany: vi.fn() },
  },
  getAdminSessionMock: vi.fn(),
  getBillingDepsMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/billing/deps", () => ({ getBillingDeps: getBillingDepsMock }))

import { GET } from "@/app/api/admin/dashboard/route"
import { NextRequest } from "next/server"

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingDepsMock.mockReturnValue(null)
    prismaMock.user.count.mockResolvedValue(10)
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.profile.count.mockResolvedValue(5)
    prismaMock.profile.findMany.mockResolvedValue([])
    prismaMock.ticket.count.mockResolvedValue(2)
    prismaMock.ticket.findMany.mockResolvedValue([])
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/admin/dashboard")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns dashboard KPIs", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const req = new NextRequest("http://localhost/api/admin/dashboard")
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.totalUsers).toBe(10)
    expect(data.totalSites).toBe(5)
    expect(data.openTickets).toBe(2)
  })

  it("counts active subscriptions and cancellations per site from the billing mirror", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    getBillingDepsMock.mockReturnValue({ asaas: { environment: "SANDBOX" } })
    const req = new NextRequest("http://localhost/api/admin/dashboard?from=2026-10-01&to=2026-10-09")
    await GET(req)

    const wheres = prismaMock.profile.count.mock.calls.map((c) => c[0]?.where)
    expect(wheres).toContainEqual({ billingStatus: { in: ["ACTIVE", "GRACE"] } })
    const canceled = wheres.find((w) => w?.billingSubscriptions)
    expect(canceled.billingSubscriptions.some).toMatchObject({
      environment: "SANDBOX",
      canceledAt: { gte: new Date("2026-10-01"), lte: new Date("2026-10-09") },
    })
    expect(canceled.billingSubscriptions.none).toEqual({ environment: "SANDBOX", status: "ACTIVE" })
    expect(JSON.stringify(prismaMock.profile.count.mock.calls)).not.toMatch(/stripe/i)
  })

  it("selects only display fields for the latest sites (no Stripe ids)", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    await GET(new NextRequest("http://localhost/api/admin/dashboard"))
    const query = prismaMock.profile.findMany.mock.calls[0][0]
    expect(query.include).toBeUndefined()
    expect(Object.keys(query.select)).toEqual(["id", "slug", "createdAt", "user"])
  })
})
