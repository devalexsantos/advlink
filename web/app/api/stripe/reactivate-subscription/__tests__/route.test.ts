import { describe, it, expect, vi, beforeEach } from "vitest"

const { sessionMock, prismaMock, stripeMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
  stripeMock: {
    subscriptions: {
      list: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("next-auth", () => ({ getServerSession: sessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))

import { POST } from "@/app/api/stripe/reactivate-subscription/route"

describe("POST /api/stripe/reactivate-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    sessionMock.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("returns 400 if no stripeCustomerId", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null })
    const res = await POST()
    expect(res.status).toBe(400)
  })

  it("returns 400 if no subscription pending cancellation", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1" })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_1", cancel_at_period_end: false }] })
    const res = await POST()
    expect(res.status).toBe(400)
  })

  it("reactivates subscription by setting cancel_at_period_end to false", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1" })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_99", cancel_at_period_end: true }] })
    stripeMock.subscriptions.update.mockResolvedValue({})

    const res = await POST()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_99", { cancel_at_period_end: false })
  })
})
