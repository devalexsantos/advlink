// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, stripeMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
  stripeMock: {
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_new" }) },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
      },
    },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { POST } from "@/app/api/stripe/create-checkout/route"

describe("POST /api/stripe/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_ID = "price_test"
    getActiveSiteIdMock.mockResolvedValue("profile-1")
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("creates new Stripe customer when none exists", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ email: "u@test.com", stripeCustomerId: null })
    prismaMock.user.update.mockResolvedValue({})
    const res = await POST()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.url).toContain("checkout.stripe.com")
    expect(stripeMock.customers.create).toHaveBeenCalled()
  })

  it("reuses existing Stripe customer", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ email: "u@test.com", stripeCustomerId: "cus_existing" })
    const res = await POST()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.url).toContain("checkout.stripe.com")
    expect(stripeMock.customers.create).not.toHaveBeenCalled()
  })
})
