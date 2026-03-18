// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, stripeMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    user: {
      count: vi.fn(),
    },
  },
  stripeMock: {
    subscriptions: {
      list: vi.fn(),
    },
  },
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))

import { GET } from "@/app/api/admin/financial/route"

const adminSession = { id: "admin-1", role: "admin" }

describe("GET /api/admin/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue(adminSession)
    // Default DB counts: paying=5, trial=3, recentlyCancelled=1
    prismaMock.user.count
      .mockResolvedValueOnce(5)  // paying (isActive: true, stripeCustomerId: { not: null })
      .mockResolvedValueOnce(3)  // trial (isActive: false, stripeCustomerId: null)
      .mockResolvedValueOnce(1)  // recentlyCancelled (isActive: false, stripeCustomerId: { not: null })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [] })
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns DB counts for paying, trial, and recentlyCancelled", async () => {
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.paying).toBe(5)
    expect(data.trial).toBe(3)
    expect(data.recentlyCancelled).toBe(1)
  })

  it("queries paying users with correct prisma filter", async () => {
    await GET()
    expect(prismaMock.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, stripeCustomerId: { not: null } },
      })
    )
  })

  it("queries trial users with correct prisma filter", async () => {
    await GET()
    expect(prismaMock.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: false, stripeCustomerId: null },
      })
    )
  })

  it("queries recently cancelled users with correct prisma filter including date range", async () => {
    await GET()
    const calls = prismaMock.user.count.mock.calls
    const cancelledCall = calls[2][0]
    expect(cancelledCall.where.isActive).toBe(false)
    expect(cancelledCall.where.stripeCustomerId).toEqual({ not: null })
    expect(cancelledCall.where.updatedAt.gte).toBeInstanceOf(Date)
    // Verify the date is approximately 30 days ago
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const diff = Math.abs(cancelledCall.where.updatedAt.gte.getTime() - thirtyDaysAgo)
    expect(diff).toBeLessThan(5000) // within 5 seconds tolerance
  })

  it("calculates MRR by summing active subscription amounts", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_1",
          status: "active",
          current_period_end: 1700000000,
          customer: { email: "user1@test.com" },
          items: { data: [{ price: { unit_amount: 4990 } }] },
        },
        {
          id: "sub_2",
          status: "active",
          current_period_end: 1700000000,
          customer: { email: "user2@test.com" },
          items: { data: [{ price: { unit_amount: 4990 } }] },
        },
      ],
    })

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    // MRR is sum of unit_amounts divided by 100: (4990 + 4990) / 100 = 99.8
    expect(data.mrr).toBe(99.8)
  })

  it("returns subscription list with correct shape", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_abc",
          status: "active",
          current_period_end: 1750000000,
          customer: { email: "lawyer@example.com" },
          items: { data: [{ price: { unit_amount: 9900 } }] },
        },
      ],
    })

    const res = await GET()
    const data = await res.json()

    expect(data.subscriptions).toHaveLength(1)
    expect(data.subscriptions[0]).toMatchObject({
      id: "sub_abc",
      customerEmail: "lawyer@example.com",
      status: "active",
      amount: 99,
      currentPeriodEnd: 1750000000,
    })
  })

  it("sets customerEmail to null when customer is a plain string ID", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_str",
          status: "active",
          current_period_end: 1700000000,
          customer: "cus_xyz", // unexpanded string
          items: { data: [{ price: { unit_amount: 4990 } }] },
        },
      ],
    })

    const res = await GET()
    const data = await res.json()
    expect(data.subscriptions[0].customerEmail).toBeNull()
  })

  it("sets customerEmail to null when customer object has no email", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_noemail",
          status: "active",
          current_period_end: 1700000000,
          customer: { email: null },
          items: { data: [{ price: { unit_amount: 4990 } }] },
        },
      ],
    })

    const res = await GET()
    const data = await res.json()
    expect(data.subscriptions[0].customerEmail).toBeNull()
  })

  it("handles subscription item with null unit_amount as zero", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_free",
          status: "active",
          current_period_end: 1700000000,
          customer: { email: "free@test.com" },
          items: { data: [{ price: { unit_amount: null } }] },
        },
      ],
    })

    const res = await GET()
    const data = await res.json()
    expect(data.mrr).toBe(0)
    expect(data.subscriptions[0].amount).toBe(0)
  })

  it("returns mrr=0 and empty subscriptions when Stripe throws an error", async () => {
    stripeMock.subscriptions.list.mockRejectedValue(new Error("Stripe not configured"))

    const res = await GET()
    const data = await res.json()

    // Route catches Stripe errors gracefully
    expect(res.status).toBe(200)
    expect(data.mrr).toBe(0)
    expect(data.subscriptions).toEqual([])
    // DB counts should still be present
    expect(data.paying).toBe(5)
    expect(data.trial).toBe(3)
  })

  it("calls Stripe with status active, limit 100, and expanded customer", async () => {
    await GET()
    expect(stripeMock.subscriptions.list).toHaveBeenCalledWith({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    })
  })
})
