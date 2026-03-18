// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, stripeMock, trackEventMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    profile: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
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
          subscription: "sub_123",
          customer_details: { email: "user@test.com" },
          metadata: { userId: "u1", profileId: "p1" },
        },
      },
    })
    prismaMock.user.update.mockResolvedValue({ id: "u1" })
    prismaMock.profile.update.mockResolvedValue({ id: "p1", isActive: true })
    prismaMock.profile.findUnique.mockResolvedValue({ slug: "test" })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalled()
    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ isActive: true }),
      })
    )
  })

  it("handles subscription.updated - active", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_123", customer: "cus_123", status: "active" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123" },
        data: { isActive: true },
      })
    )
  })

  it("handles subscription.deleted - deactivates profile", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_123", customer: "cus_123" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123" },
        data: { isActive: false },
      })
    )
  })

  it("handles checkout.session.completed with no customerId — skips user/profile updates", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: null,
          subscription: "sub_123",
          customer_details: { email: "user@test.com" },
          metadata: { userId: "u1", profileId: "p1" },
        },
      },
    })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("handles checkout.session.completed with email-only linking (no userId in metadata)", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_456",
          subscription: "sub_456",
          customer_details: { email: "newuser@test.com" },
          metadata: { profileId: "p2" },
        },
      },
    })
    prismaMock.user.upsert.mockResolvedValue({ id: "u-new" })
    prismaMock.profile.update.mockResolvedValue({ id: "p2", isActive: true })
    prismaMock.profile.findUnique.mockResolvedValue({ slug: "new-user" })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "newuser@test.com" },
        update: { stripeCustomerId: "cus_456" },
        create: { email: "newuser@test.com", stripeCustomerId: "cus_456" },
      })
    )
  })

  it("handles checkout.session.completed without profileId — skips profile.update", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_789",
          subscription: "sub_789",
          customer_details: { email: null },
          metadata: { userId: "u3" },
        },
      },
    })
    prismaMock.user.update.mockResolvedValue({ id: "u3" })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalled()
    expect(prismaMock.profile.update).not.toHaveBeenCalled()
  })

  it("handles customer.subscription.created the same as updated", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: { id: "sub_new", customer: "cus_new", status: "active" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_new" },
        data: { isActive: true },
      })
    )
  })

  it("handles subscription.updated with trialing status as active", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_trial", customer: "cus_trial", status: "trialing" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    await POST(req)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: true },
      })
    )
  })

  it("handles subscription.updated with past_due status as active", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_past", customer: "cus_past", status: "past_due" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    await POST(req)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: true },
      })
    )
  })

  it("handles subscription.updated with canceled status as inactive", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_canceled", customer: "cus_canceled", status: "canceled" },
      },
    })
    prismaMock.profile.updateMany.mockResolvedValue({ count: 1 })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    await POST(req)
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      })
    )
  })

  it("returns 500 with error flag when handler throws internally", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_err", customer: "cus_err" },
      },
    })
    prismaMock.profile.updateMany.mockRejectedValue(new Error("DB timeout"))
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(data.error).toBe(true)
  })

  it("handles unrecognized event type gracefully (default branch)", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: { object: {} },
    })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.received).toBe(true)
    expect(prismaMock.profile.updateMany).not.toHaveBeenCalled()
  })

  it("returns 400 with message text when signature verification throws a non-Error value", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw "string-error"
    })
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain("Unknown error")
  })
})
