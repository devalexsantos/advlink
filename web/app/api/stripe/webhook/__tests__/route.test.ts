// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, stripeMock, trackEventMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    profile: { findUnique: vi.fn() },
  },
  stripeMock: {
    webhooks: { constructEvent: vi.fn() },
  },
  trackEventMock: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map([["stripe-signature", "sig_test"]])),
}))

import { POST } from "@/app/api/stripe/webhook/route"

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for invalid signature", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("handles checkout.session.completed", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          customer_details: { email: "user@test.com" },
          metadata: {},
        },
      },
    })
    prismaMock.user.upsert.mockResolvedValue({ id: "u1" })
    prismaMock.profile.findUnique.mockResolvedValue({ slug: "test" })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.upsert).toHaveBeenCalled()
  })

  it("handles subscription.updated - active", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { customer: "cus_123", status: "active" },
      },
    })
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: true },
      })
    )
  })

  it("handles subscription.deleted - deactivates user", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { customer: "cus_123" },
      },
    })
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      })
    )
  })
})
