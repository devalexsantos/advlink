// @vitest-environment node
// Billing routes against a real Postgres (DATABASE_URL_TEST) and the in-memory Asaas. Skipped without it.
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"
import type { PrismaClient } from "@prisma/client"

const TEST_URL = process.env.DATABASE_URL_TEST
const { db, sessionMock, activeSiteMock, notifyMock, cancelNotifyMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: PC } = require("@prisma/client") as typeof import("@prisma/client")
  const url = process.env.DATABASE_URL_TEST
  return {
    db: url ? new PC({ datasourceUrl: url }) : (null as unknown as PrismaClient),
    sessionMock: vi.fn(),
    activeSiteMock: vi.fn(),
    notifyMock: vi.fn().mockResolvedValue(undefined),
    cancelNotifyMock: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("next-auth", () => ({ getServerSession: sessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: activeSiteMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/billing/notify", () => ({ notifyBilling: notifyMock, notifyCancellationRequested: cancelNotifyMock }))

import { FakeAsaas } from "@/lib/billing/asaas-fake"
import { setAsaasForTests } from "@/lib/billing/asaas-client"
import { POST as checkout } from "@/app/api/billing/checkout/route"
import { GET as status } from "@/app/api/billing/status/route"
import { POST as cancel } from "@/app/api/billing/cancel/route"
import { POST as webhook } from "@/app/api/webhooks/asaas/route"
import { GET as sweep } from "@/app/api/cron/billing-sweep/route"

const TOKEN = "t".repeat(64)
const CRON = "c".repeat(40)

describe.skipIf(!TEST_URL)("billing routes (Postgres)", () => {
  let asaas: FakeAsaas
  let userId: string
  let profileId: string
  let otherProfileId: string

  const post = (body: unknown) =>
    new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  const hook = (body: unknown, token = TOKEN) =>
    webhook(new Request("http://localhost/api/webhooks/asaas", {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": token },
      body: JSON.stringify(body),
    }))
  let seq = 0
  const paymentHook = (paymentId: string, event = "PAYMENT_CONFIRMED") => hook({ id: `evt_${++seq}&1`, event, payment: { id: paymentId } })
  const profile = (id = profileId) => db.profile.findUniqueOrThrow({ where: { id } })
  const lastLinkId = () => Object.keys(asaas.links).at(-1)!

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "WebhookEvent", "BillingPayment", "BillingSubscription", "BillingPaymentLink", "Profile", "User" CASCADE')
    asaas = new FakeAsaas()
    setAsaasForTests(asaas)
    vi.stubEnv("ASAAS_WEBHOOK_AUTH_TOKEN", TOKEN)
    vi.stubEnv("CRON_SECRET", CRON)
    notifyMock.mockClear()
    cancelNotifyMock.mockClear()
    const user = await db.user.create({ data: { email: `u${Date.now()}@t.com` } })
    userId = user.id
    profileId = (await db.profile.create({ data: { userId, slug: `a${Date.now()}`, setupComplete: true } })).id
    otherProfileId = (await db.profile.create({ data: { userId, slug: `b${Date.now()}`, setupComplete: true } })).id
    sessionMock.mockResolvedValue({ user: { id: userId } })
    activeSiteMock.mockResolvedValue(profileId)
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    setAsaasForTests(undefined)
    await db?.$disconnect()
  })

  describe("checkout", () => {
    it("401 without session, 400 for an unknown method", async () => {
      sessionMock.mockResolvedValueOnce(null)
      expect((await checkout(post({ method: "pix" }))).status).toBe(401)
      expect((await checkout(post({ method: "bitcoin" }))).status).toBe(400)
    })

    it("creates one link per method with the site as externalReference and reuses it", async () => {
      const r1 = await (await checkout(post({ method: "card_boleto" }))).json()
      const r2 = await (await checkout(post({ method: "card_boleto" }))).json()
      const r3 = await (await checkout(post({ method: "pix" }))).json()
      expect(r1.url).toBe(r2.url)
      expect(r3.url).not.toBe(r1.url)
      expect(asaas.calls.filter((c) => c.startsWith("createPaymentLink"))).toEqual([
        `createPaymentLink:UNDEFINED:${profileId}`,
        `createPaymentLink:PIX:${profileId}`,
      ])
      expect((await profile()).billingStatus).toBe("PENDING")
    })

    it("409 when the site is already published (no double charge — BIL-2)", async () => {
      await checkout(post({ method: "card_boleto" }))
      const { payment } = asaas.simulatePayment(lastLinkId(), { status: "CONFIRMED", dueDate: "2026-10-06" })
      await paymentHook(payment.id)
      const res = await checkout(post({ method: "pix" }))
      expect(res.status).toBe(409)
      expect((await res.json()).code).toBe("ALREADY_ACTIVE")
    })

    it("409 with the invoice when a boleto is still open; replacePending switches method", async () => {
      await checkout(post({ method: "card_boleto" }))
      const { payment, subscription } = asaas.simulatePayment(lastLinkId(), { status: "PENDING", dueDate: "2099-10-09", billingType: "BOLETO" })
      await paymentHook(payment.id, "PAYMENT_CREATED")

      const blocked = await checkout(post({ method: "pix" }))
      expect(blocked.status).toBe(409)
      expect(await blocked.json()).toMatchObject({ code: "PENDING_PAYMENT", invoiceUrl: payment.invoiceUrl })

      const switched = await checkout(post({ method: "pix", replacePending: true }))
      expect(switched.status).toBe(200)
      expect(asaas.calls).toContain(`deleteSubscription:${subscription.id}`)
    })

    it("403 for a site suspended by the admin", async () => {
      await db.profile.update({ where: { id: profileId }, data: { suspendedByAdmin: true } })
      expect((await checkout(post({ method: "pix" }))).status).toBe(403)
    })

    it("503 when Asaas isn't configured", async () => {
      setAsaasForTests(null)
      expect((await checkout(post({ method: "pix" }))).status).toBe(503)
    })
  })

  describe("webhook", () => {
    it("503 without a configured token (never accepts unsigned events — SEC-4)", async () => {
      vi.stubEnv("ASAAS_WEBHOOK_AUTH_TOKEN", "")
      expect((await hook({ id: "evt_1", event: "PAYMENT_CONFIRMED", payment: { id: "x" } })).status).toBe(503)
      vi.stubEnv("ASAAS_WEBHOOK_AUTH_TOKEN", "short")
      expect((await hook({ id: "evt_1", event: "PAYMENT_CONFIRMED", payment: { id: "x" } }, "short")).status).toBe(503)
    })

    it("401 with a wrong token", async () => {
      expect((await hook({ id: "evt_1", event: "PAYMENT_CONFIRMED" }, "x".repeat(64))).status).toBe(401)
      expect(await db.webhookEvent.count()).toBe(0)
    })

    it("400 for a malformed payload", async () => {
      expect((await hook({ event: "PAYMENT_CONFIRMED" })).status).toBe(400)
    })

    it("publishes on payment and answers 200 to a redelivery without reprocessing", async () => {
      await checkout(post({ method: "card_boleto" }))
      const { payment } = asaas.simulatePayment(lastLinkId(), { status: "CONFIRMED", dueDate: "2026-10-06" })
      const body = { id: "evt_abc&99", event: "PAYMENT_CONFIRMED", payment: { id: payment.id } }
      const first = await hook(body)
      expect(await first.json()).toMatchObject({ received: true, result: "ACTIVE" })
      const again = await hook(body)
      expect(again.status).toBe(200)
      expect(await again.json()).toMatchObject({ duplicate: true })
      expect(await profile()).toMatchObject({ isActive: true, billingStatus: "ACTIVE" })
      expect(notifyMock).toHaveBeenCalledTimes(1)
    })

    it("still answers 200 when processing fails, and the sweep recovers it", async () => {
      await checkout(post({ method: "card_boleto" }))
      const { payment } = asaas.simulatePayment(lastLinkId(), { status: "CONFIRMED", dueDate: "2026-10-06" })
      const original = asaas.getPayment.bind(asaas)
      asaas.getPayment = async () => {
        throw new Error("timeout")
      }
      const res = await paymentHook(payment.id)
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ queued: true })
      asaas.getPayment = original

      const run = await sweep(new Request("http://localhost/api/cron/billing-sweep", { headers: { authorization: `Bearer ${CRON}` } }))
      expect(await run.json()).toMatchObject({ retried: 1, failed: 0 })
      expect((await profile()).isActive).toBe(true)
    })
  })

  describe("status", () => {
    it("confirms the payment straight from Asaas on refresh, before the webhook arrives (BIL-3)", async () => {
      await checkout(post({ method: "pix" }))
      asaas.simulatePayment(lastLinkId(), { status: "RECEIVED", dueDate: "2026-10-06", billingType: "PIX" })
      const plain = await (await status(new Request("http://localhost/api/billing/status"))).json()
      expect(plain.billingStatus).toBe("PENDING")
      const refreshed = await (await status(new Request("http://localhost/api/billing/status?refresh=1"))).json()
      expect(refreshed).toMatchObject({ billingStatus: "ACTIVE", published: true, renews: true })
    })

    it("only reports the active site (UX-5)", async () => {
      activeSiteMock.mockResolvedValue(otherProfileId)
      const body = await (await status(new Request("http://localhost/api/billing/status"))).json()
      expect(body).toMatchObject({ billingStatus: "NONE", published: false, renews: false, pendingPayment: null })
    })
  })

  describe("cancel", () => {
    it("cancels only the active site's subscription and keeps it published until the paid period ends (BIL-1)", async () => {
      // other site of the same user is paid too
      activeSiteMock.mockResolvedValue(otherProfileId)
      await checkout(post({ method: "pix" }))
      const other = asaas.simulatePayment(lastLinkId(), { status: "RECEIVED", dueDate: "2099-10-06", billingType: "PIX" })
      await paymentHook(other.payment.id, "PAYMENT_RECEIVED")

      activeSiteMock.mockResolvedValue(profileId)
      await checkout(post({ method: "card_boleto" }))
      const mine = asaas.simulatePayment(lastLinkId(), { status: "CONFIRMED", dueDate: "2099-10-06" })
      await paymentHook(mine.payment.id)

      const res = await cancel(post({ reason: "Preço" }))
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ ok: true, billingStatus: "ACTIVE", activeUntil: "2099-11-05" })
      expect(asaas.calls).toContain(`deleteSubscription:${mine.subscription.id}`)
      expect(asaas.calls).not.toContain(`deleteSubscription:${other.subscription.id}`)
      expect((await profile()).isActive).toBe(true)
      expect(cancelNotifyMock).toHaveBeenCalledWith(expect.objectContaining({ profileId, activeUntil: "2099-11-05" }))
    })

    it("404 when the site has no subscription, 400 without a reason", async () => {
      expect((await cancel(post({ reason: "" }))).status).toBe(400)
      const res = await cancel(post({ reason: "Preço" }))
      expect(res.status).toBe(404)
      expect((await res.json()).code).toBe("NO_SUBSCRIPTION")
    })
  })

  describe("cron sweep", () => {
    it("401 without the bearer, 503 when not configured", async () => {
      expect((await sweep(new Request("http://localhost/api/cron/billing-sweep"))).status).toBe(401)
      vi.stubEnv("CRON_SECRET", "")
      expect((await sweep(new Request("http://localhost/api/cron/billing-sweep", { headers: { authorization: "Bearer " } }))).status).toBe(503)
    })
  })
})
