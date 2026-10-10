// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { getResendMock, prismaMock, sendMock } = vi.hoisted(() => ({
  getResendMock: vi.fn(),
  sendMock: vi.fn(),
  prismaMock: { profile: { findUnique: vi.fn() } },
}))

vi.mock("@/lib/resend", () => ({
  getResend: getResendMock,
  EMAIL_FROM: "AdvLink <no-reply@advlink.site>",
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { notifyBilling, notifyCancellationRequested } from "@/lib/billing/notify"
import type { BillingNotification } from "@/lib/billing/sync"

const base = (notice: BillingNotification["notice"], over: Partial<BillingNotification> = {}) =>
  ({
    profileId: "cprofile1",
    notice,
    from: "ACTIVE",
    to: "OVERDUE",
    entitlement: { state: "GRACE", coveredUntil: "2026-10-01", graceUntil: "2026-10-11" },
    invoiceUrl: "https://www.asaas.com/i/abc123",
    ...over,
  }) as unknown as BillingNotification

describe("billing e-mails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    delete process.env.BILLING_TEAM_EMAIL
    sendMock.mockResolvedValue({})
    getResendMock.mockReturnValue({ emails: { send: sendMock } })
    prismaMock.profile.findUnique.mockResolvedValue({ slug: "joao-silva", user: { email: "joao@exemplo.com" } })
  })
  afterEach(() => vi.restoreAllMocks())

  it("activated: confirms payment and links to the public site", async () => {
    await notifyBilling(base("activated"))
    const arg = sendMock.mock.calls[0][0]
    expect(arg.to).toBe("joao@exemplo.com")
    expect(arg.from).toBe("AdvLink <no-reply@advlink.site>")
    expect(arg.subject).toBe("Pagamento confirmado: seu site está publicado")
    expect(arg.html).toContain("https://joao-silva.advlink.site/")
    expect(arg.html).toContain("Ver meu site")
    expect(arg.html).toContain("automaticamente")
  })

  it("links to the active custom domain instead of the subdomain", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      slug: "joao-silva",
      customDomain: { host: "escritorio.adv.br", status: "active" },
      user: { email: "joao@exemplo.com" },
    })
    await notifyBilling(base("activated"))
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain("https://escritorio.adv.br/")
    expect(html).not.toContain("joao-silva.advlink.site")
  })

  it("activated/reactivated: monthly by default, yearly when the open subscription is yearly", async () => {
    await notifyBilling(base("activated"))
    expect(sendMock.mock.calls[0][0].html).toContain("automaticamente a cada mês")
    expect(prismaMock.profile.findUnique.mock.calls[0][0].select.billingSubscriptions).toMatchObject({ where: { status: "ACTIVE" } })

    prismaMock.profile.findUnique.mockResolvedValue({
      slug: "joao-silva",
      user: { email: "joao@exemplo.com" },
      billingSubscriptions: [{ cycle: "YEARLY" }],
    })
    await notifyBilling(base("activated"))
    await notifyBilling(base("reactivated"))
    expect(sendMock.mock.calls[1][0].html).toContain("automaticamente a cada ano")
    expect(sendMock.mock.calls[2][0].html).toContain("automaticamente a cada ano")
    expect(sendMock.mock.calls[1][0].html).not.toContain("a cada mês")
  })

  it("reactivated: site is back online", async () => {
    await notifyBilling(base("reactivated"))
    const arg = sendMock.mock.calls[0][0]
    expect(arg.subject).toBe("Seu site voltou ao ar")
    expect(arg.html).toContain("https://joao-silva.advlink.site/")
  })

  it("overdue: shows grace date dd/mm/aaaa and invoice CTA", async () => {
    await notifyBilling(base("overdue"))
    const arg = sendMock.mock.calls[0][0]
    expect(arg.subject).toBe("Pagamento em atraso na sua assinatura AdvLink")
    expect(arg.html).toContain("11/10/2026")
    expect(arg.html).toContain("Pagar fatura")
    expect(arg.html).toContain('href="https://www.asaas.com/i/abc123"')
  })

  it("overdue without invoiceUrl: CTA goes to Minha conta", async () => {
    await notifyBilling(base("overdue", { invoiceUrl: null }))
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).toContain("/profile/account")
    expect(html).toContain("Pagar fatura")
  })

  it("does not link non-http invoice URLs", async () => {
    await notifyBilling(base("overdue", { invoiceUrl: "javascript:alert(1)" }))
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).not.toContain("javascript:")
    expect(html).toContain("/profile/account")
  })

  it("suspended: offline, paying reactivates, 30 days to cancel", async () => {
    await notifyBilling(base("suspended"))
    const arg = sendMock.mock.calls[0][0]
    expect(arg.subject).toBe("Seu site está fora do ar por falta de pagamento")
    expect(arg.html).toContain("automaticamente")
    expect(arg.html).toContain("30 dias")
    expect(arg.html).toContain("https://www.asaas.com/i/abc123")
  })

  it("canceled: points to Minha conta to reactivate", async () => {
    await notifyBilling(base("canceled"))
    const arg = sendMock.mock.calls[0][0]
    expect(arg.subject).toBe("Sua assinatura AdvLink foi encerrada")
    expect(arg.html).toContain("/profile/account")
    expect(arg.html).toContain("a qualquer momento")
  })

  it("notifyBilling does not throw when Resend fails or user is missing", async () => {
    sendMock.mockRejectedValueOnce(new Error("resend down"))
    await expect(notifyBilling(base("activated"))).resolves.toBeUndefined()
    prismaMock.profile.findUnique.mockResolvedValueOnce(null)
    await expect(notifyBilling(base("activated"))).resolves.toBeUndefined()
    prismaMock.profile.findUnique.mockRejectedValueOnce(new Error("db"))
    await expect(notifyBilling(base("activated"))).resolves.toBeUndefined()
  })

  it("does nothing without RESEND_API_KEY", async () => {
    getResendMock.mockReturnValue(null)
    await expect(notifyBilling(base("activated"))).resolves.toBeUndefined()
    expect(sendMock).not.toHaveBeenCalled()
  })

  describe("notifyCancellationRequested", () => {
    it("sends confirmation to the lawyer and an internal e-mail to the team (fallback address)", async () => {
      await notifyCancellationRequested({ profileId: "cprofile1", reason: "Muito caro", activeUntil: "2026-11-05" })
      expect(sendMock).toHaveBeenCalledTimes(2)
      const lawyer = sendMock.mock.calls.map((c) => c[0]).find((a) => a.to === "joao@exemplo.com")
      const team = sendMock.mock.calls.map((c) => c[0]).find((a) => a.to === "advlinkcontato@gmail.com")
      expect(lawyer.html).toContain("fica no ar até <strong>05/11/2026</strong>")
      expect(team.subject).toContain("joao-silva")
      expect(team.html).toContain("joao@exemplo.com")
      expect(team.html).toContain("Muito caro")
    })

    it("uses BILLING_TEAM_EMAIL and says site is already offline when no activeUntil", async () => {
      process.env.BILLING_TEAM_EMAIL = "time@advlink.site"
      await notifyCancellationRequested({ profileId: "cprofile1", reason: "x", activeUntil: null })
      const calls = sendMock.mock.calls.map((c) => c[0])
      expect(calls.some((a) => a.to === "time@advlink.site")).toBe(true)
      expect(calls.find((a) => a.to === "joao@exemplo.com").html).toContain("já está fora do ar")
    })

    it("escapes the reason in HTML", async () => {
      await notifyCancellationRequested({
        profileId: "cprofile1",
        reason: '<script>alert("x")</script>',
        activeUntil: null,
      })
      const team = sendMock.mock.calls.map((c) => c[0]).find((a) => a.to === "advlinkcontato@gmail.com")
      expect(team.html).not.toContain("<script>")
      expect(team.html).toContain("&lt;script&gt;")
    })

    it("does not throw when Resend fails", async () => {
      sendMock.mockRejectedValue(new Error("boom"))
      await expect(
        notifyCancellationRequested({ profileId: "cprofile1", reason: "x", activeUntil: null })
      ).resolves.toBeUndefined()
    })
  })
})
