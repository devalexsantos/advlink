import { describe, it, expect, vi, beforeEach } from "vitest"

const { sessionMock, prismaMock, stripeMock, nodemailerMock } = vi.hoisted(() => ({
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
  nodemailerMock: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue(undefined) })),
  },
}))

vi.mock("next-auth", () => ({ getServerSession: sessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/emails/baseTemplate", () => ({ emailTemplate: vi.fn(() => "<html>email</html>") }))
vi.mock("nodemailer", () => ({ default: nodemailerMock }))

import { POST } from "@/app/api/stripe/cancel-subscription/route"

describe("POST /api/stripe/cancel-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    sessionMock.mockResolvedValue(null)
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 if user has no stripeCustomerId", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: null })
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 if no active subscription", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", email: "a@b.com" })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_1", status: "canceled" }] })
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }))
    expect(res.status).toBe(400)
  })

  it("cancels active subscription at period end", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", email: "a@b.com" })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_99", status: "active" }] })
    stripeMock.subscriptions.update.mockResolvedValue({})

    const body = JSON.stringify({ reason: "too expensive", details: "need cheaper plan" })
    const res = await POST(new Request("http://localhost", { method: "POST", body }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_99", { cancel_at_period_end: true })
  })

  it("cancels trialing subscription", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", email: "a@b.com" })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_trial", status: "trialing" }] })
    stripeMock.subscriptions.update.mockResolvedValue({})

    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }))
    expect(res.status).toBe(200)
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_trial", { cancel_at_period_end: true })
  })
})
