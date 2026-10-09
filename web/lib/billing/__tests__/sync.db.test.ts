// @vitest-environment node
// Integration tests against a real Postgres (DATABASE_URL_TEST, migrated). Skipped when it's not set.
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"

const TEST_URL = process.env.DATABASE_URL_TEST
const { db, trackEventMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: PC } = require("@prisma/client") as typeof import("@prisma/client")
  const url = process.env.DATABASE_URL_TEST
  return {
    db: url ? new PC({ datasourceUrl: url }) : (null as unknown as PrismaClient),
    trackEventMock: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))

import { FakeAsaas } from "@/lib/billing/asaas-fake"
import { billingSweep, processWebhookEvent, recomputeProfile, type BillingDeps, type BillingNotification } from "@/lib/billing/sync"

if (!TEST_URL) console.warn("[billing] DATABASE_URL_TEST não definido: testes de integração do billing pulados")

describe.skipIf(!TEST_URL)("billing sync (Postgres)", () => {
  let asaas: FakeAsaas
  let notified: BillingNotification[]
  let now: Date
  let deps: BillingDeps
  let profileId: string

  async function createLink(billingType: "UNDEFINED" | "PIX" = "UNDEFINED") {
    const link = await asaas.createPaymentLink({ billingType, externalReference: profileId })
    await db.billingPaymentLink.create({ data: { environment: "SANDBOX", asaasId: link.id, profileId, billingType, url: link.url } })
    await recomputeProfile(deps, profileId) // same as the checkout route
    return link.id
  }

  let eventSeq = 0
  async function deliver(payload: Record<string, unknown>) {
    eventSeq++
    const row = await db.webhookEvent.create({
      data: { environment: "SANDBOX", eventId: `evt_test&${eventSeq}`, eventType: String(payload.event), payload: payload as object },
    })
    return processWebhookEvent(deps, row.id)
  }
  const paymentEvent = (id: string, event = "PAYMENT_CONFIRMED") => deliver({ event, payment: { object: "payment", id } })
  const profile = () => db.profile.findUniqueOrThrow({ where: { id: profileId } })

  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "WebhookEvent", "BillingPayment", "BillingSubscription", "BillingPaymentLink", "Profile", "User" CASCADE'
    )
    asaas = new FakeAsaas()
    notified = []
    now = new Date("2026-10-06T15:00:00Z")
    deps = { asaas, now: () => now, notify: async (n) => void notified.push(n) }
    trackEventMock.mockClear()
    const user = await db.user.create({ data: { email: `u${Date.now()}@test.com` } })
    const p = await db.profile.create({ data: { userId: user.id, slug: `s${Date.now()}` } })
    profileId = p.id
  })

  afterAll(async () => {
    await db?.$disconnect()
  })

  it("card CONFIRMED publishes the site, closes the link and notifies once", async () => {
    const link = await createLink()
    const { payment } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    expect(await paymentEvent(payment.id)).toBe("ACTIVE")

    const p = await profile()
    expect(p).toMatchObject({ billingStatus: "ACTIVE", isActive: true })
    expect(p.paidUntil?.toISOString().slice(0, 10)).toBe("2026-11-05")
    expect(asaas.links[link].active).toBe(false)
    expect(notified.map((n) => n.notice)).toEqual(["activated"])
    expect(trackEventMock.mock.calls.map((c) => c[0])).toEqual(["subscription_started", "site_published"])
  })

  it("starting a checkout marks a new site as PENDING", async () => {
    await createLink()
    expect(await profile()).toMatchObject({ billingStatus: "PENDING", isActive: false })
  })

  it("a redelivered or repeated event changes nothing (no duplicate e-mails or events)", async () => {
    const link = await createLink()
    const { payment } = asaas.simulatePayment(link, { status: "RECEIVED", dueDate: "2026-10-06", billingType: "PIX" })
    await paymentEvent(payment.id, "PAYMENT_RECEIVED")
    await paymentEvent(payment.id, "PAYMENT_RECEIVED")
    await paymentEvent(payment.id, "PAYMENT_UPDATED")
    expect(notified).toHaveLength(1)
    expect(trackEventMock).toHaveBeenCalledTimes(2)
    expect(await db.billingPayment.count()).toBe(1)
  })

  it("concurrent webhooks fire the transition once (seen in the sandbox: PAYMENT_CONFIRMED + SUBSCRIPTION_CREATED)", async () => {
    const link = await createLink()
    const { payment, subscription } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await Promise.all([
      paymentEvent(payment.id),
      paymentEvent(payment.id, "PAYMENT_CREATED"),
      deliver({ event: "SUBSCRIPTION_CREATED", subscription: { object: "subscription", id: subscription.id } }),
    ])
    expect(await profile()).toMatchObject({ billingStatus: "ACTIVE", isActive: true })
    expect(notified.map((n) => n.notice)).toEqual(["activated"])
    expect(trackEventMock.mock.calls.map((c) => c[0])).toEqual(["subscription_started", "site_published"])
  })

  it("an unpaid boleto does not publish (BIL-7)", async () => {
    const link = await createLink()
    const { payment } = asaas.simulatePayment(link, { status: "PENDING", dueDate: "2026-10-09", billingType: "BOLETO" })
    expect(await paymentEvent(payment.id, "PAYMENT_CREATED")).toBe("PENDING")
    expect((await profile()).isActive).toBe(false)

    asaas.setPaymentStatus(payment.id, "RECEIVED")
    expect(await paymentEvent(payment.id, "PAYMENT_RECEIVED")).toBe("ACTIVE")
  })

  it("an older event arriving late doesn't undo the activation (order-independent)", async () => {
    const link = await createLink()
    const { payment } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(payment.id, "PAYMENT_CONFIRMED")
    // the earlier PAYMENT_CREATED is delivered after: we re-fetch the current state, so it stays ACTIVE
    expect(await paymentEvent(payment.id, "PAYMENT_CREATED")).toBe("ACTIVE")
  })

  it("refund unpublishes and cancels the subscription in Asaas", async () => {
    const link = await createLink()
    const { payment, subscription } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(payment.id)
    asaas.setPaymentStatus(payment.id, "REFUNDED")
    expect(await paymentEvent(payment.id, "PAYMENT_REFUNDED")).toBe("CANCELED")
    expect((await profile()).isActive).toBe(false)
    expect(asaas.calls).toContain(`deleteSubscription:${subscription.id}`)
  })

  it("grace → suspended → churn after 30 days, then reactivation with a new payment", async () => {
    const link = await createLink()
    const { payment, subscription } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(payment.id)
    const next = asaas.addPayment(subscription.id, { status: "OVERDUE", dueDate: "2026-11-06" })
    await paymentEvent(next.id, "PAYMENT_OVERDUE")

    now = new Date("2026-11-08T15:00:00Z")
    await billingSweep(deps)
    expect(await profile()).toMatchObject({ billingStatus: "GRACE", isActive: true })

    now = new Date("2026-11-11T15:00:00Z")
    await billingSweep(deps)
    expect(await profile()).toMatchObject({ billingStatus: "SUSPENDED", isActive: false })

    now = new Date("2026-12-11T15:00:00Z") // graceUntil 2026-11-10 + 30 days passed
    await billingSweep(deps)
    const churned = await profile()
    expect(churned).toMatchObject({ billingStatus: "CANCELED", isActive: false })
    expect(churned.churnedAt).not.toBeNull()
    expect(asaas.calls).toContain(`deleteSubscription:${subscription.id}`)
    expect(notified.map((n) => n.notice)).toEqual(["activated", "overdue", "suspended", "canceled"])
    expect(notified[1].invoiceUrl).toBe(next.invoiceUrl)

    // pays again through a new link
    const link2 = await createLink("PIX")
    const again = asaas.simulatePayment(link2, { status: "RECEIVED", dueDate: "2026-12-12", billingType: "PIX" })
    expect(await paymentEvent(again.payment.id, "PAYMENT_RECEIVED")).toBe("ACTIVE")
    const back = await profile()
    expect(back).toMatchObject({ isActive: true, churnedAt: null })
    expect(notified.at(-1)?.notice).toBe("reactivated")
  })

  it("an admin suspension is never undone by a payment event (BIL-10)", async () => {
    const link = await createLink()
    await db.profile.update({ where: { id: profileId }, data: { suspendedByAdmin: true } })
    const { payment } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(payment.id)
    expect(await profile()).toMatchObject({ billingStatus: "ACTIVE", isActive: false })
  })

  it("a second unpaid subscription opened through the link is canceled once one is paid", async () => {
    const link = await createLink()
    const boleto = asaas.simulatePayment(link, { status: "PENDING", dueDate: "2026-10-09", billingType: "BOLETO" })
    await paymentEvent(boleto.payment.id, "PAYMENT_CREATED")
    const card = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(card.payment.id)
    expect(asaas.calls).toContain(`deleteSubscription:${boleto.subscription.id}`)
    expect(asaas.calls).not.toContain(`deleteSubscription:${card.subscription.id}`)
  })

  it("ignores events of other systems on the same Asaas account (no profile reference)", async () => {
    asaas.payments.pay_x = {
      id: "pay_x",
      status: "CONFIRMED",
      value: 49,
      billingType: "CREDIT_CARD",
      dueDate: "2026-10-06",
      customer: "cus_x",
      externalReference: "0f8fad5b-d9cb-469f-a165-70867728950e", // Escavador uses UUIDs
    }
    expect(await paymentEvent("pay_x")).toBe("IGNORADO_SEM_PERFIL")
    expect(await db.billingPayment.count()).toBe(0)
    expect(await db.user.count()).toBe(1) // never creates users (BIL-12)
  })

  it("never touches a legacy published site without billing data", async () => {
    await db.profile.update({ where: { id: profileId }, data: { isActive: true } })
    expect(await recomputeProfile(deps, profileId)).toBe("NONE")
    expect((await profile()).isActive).toBe(true)
  })

  it("lawyer cancellation keeps the site until the paid period ends, then CANCELED without grace", async () => {
    const link = await createLink()
    const { payment, subscription } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    await paymentEvent(payment.id)
    await asaas.deleteSubscription(subscription.id)
    await deliver({ event: "SUBSCRIPTION_DELETED", subscription: { object: "subscription", id: subscription.id } })
    expect(await profile()).toMatchObject({ billingStatus: "ACTIVE", isActive: true })

    now = new Date("2026-11-06T15:00:00Z")
    await billingSweep(deps)
    expect(await profile()).toMatchObject({ billingStatus: "CANCELED", isActive: false })
  })

  it("the sweep retries events that failed (e.g. Asaas down) instead of losing them", async () => {
    const link = await createLink()
    const { payment } = asaas.simulatePayment(link, { status: "CONFIRMED", dueDate: "2026-10-06" })
    const original = asaas.getPayment.bind(asaas)
    asaas.getPayment = async () => {
      throw new Error("Asaas indisponível")
    }
    await expect(paymentEvent(payment.id)).rejects.toThrow("indisponível")
    asaas.getPayment = original
    const result = await billingSweep(deps)
    expect(result.retried).toBe(1)
    expect(await profile()).toMatchObject({ billingStatus: "ACTIVE", isActive: true })
  })
})
