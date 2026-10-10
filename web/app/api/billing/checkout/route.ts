export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { trackEvent } from "@/lib/product-events"
import { getBillingDeps } from "@/lib/billing/deps"
import { isPaidStatus } from "@/lib/billing/entitlement"
import { recomputeProfile } from "@/lib/billing/sync"
import { normalizeCycle } from "@/lib/billing/plan"

const bodySchema = z.object({
  // Single hosted link (card, boleto or Pix on the Asaas page); the old Pix-only button was removed
  method: z.literal("card_boleto"),
  /** Monthly (R$ 49) or yearly (R$ 490) recurring link */
  cycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  /** Lawyer chose to drop an unpaid pending charge and pay another way */
  replacePending: z.boolean().optional(),
})

const UNPAID_OPEN = new Set(["PENDING", "OVERDUE"])

/** Starts (or resumes) the Asaas checkout of the active site: returns the hosted payment link. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 })
  const { method, cycle, replacePending } = parsed.data

  const deps = getBillingDeps()
  if (!deps) {
    return NextResponse.json({ error: "Pagamentos indisponíveis no momento. Tente novamente mais tarde." }, { status: 503 })
  }
  const env = deps.asaas.environment

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { id: true, slug: true, setupComplete: true, billingStatus: true, suspendedByAdmin: true },
  })
  if (!profile) return NextResponse.json({ error: "No site found" }, { status: 404 })
  if (!profile.setupComplete || !profile.slug) {
    return NextResponse.json({ error: "Conclua a configuração do site antes de publicar." }, { status: 409 })
  }
  if (profile.suspendedByAdmin) {
    return NextResponse.json(
      { code: "SUSPENDED_BY_ADMIN", error: "Este site foi suspenso pela nossa equipe. Fale com o suporte." },
      { status: 403 }
    )
  }
  // Never charge twice for the same site (BIL-2)
  if (profile.billingStatus === "ACTIVE" || profile.billingStatus === "GRACE") {
    return NextResponse.json({ code: "ALREADY_ACTIVE", error: "Este site já está publicado." }, { status: 409 })
  }

  const [payments, openSubs] = await Promise.all([
    prisma.billingPayment.findMany({ where: { profileId, environment: env }, orderBy: { dueDate: "desc" } }),
    prisma.billingSubscription.findMany({ where: { profileId, environment: env, status: "ACTIVE" } }),
  ])
  if (payments.some((p) => !p.revoked && ["AWAITING_RISK_ANALYSIS", "APPROVED_BY_RISK_ANALYSIS", "AUTHORIZED"].includes(p.status))) {
    return NextResponse.json(
      { code: "PAYMENT_IN_REVIEW", error: "Seu pagamento está em análise pela operadora. Aguarde alguns minutos." },
      { status: 409 }
    )
  }

  // An open subscription with an unpaid charge (boleto not paid yet, or overdue): pay that invoice
  // instead of opening a second subscription — unless the lawyer explicitly wants to switch.
  const unpaid = payments.find((p) => !p.revoked && UNPAID_OPEN.has(p.status) && p.invoiceUrl)
  if (openSubs.length && unpaid && !replacePending) {
    return NextResponse.json(
      {
        code: "PENDING_PAYMENT",
        error: "Você já tem uma cobrança em aberto para este site.",
        invoiceUrl: unpaid.invoiceUrl,
      },
      { status: 409 }
    )
  }
  if (replacePending) {
    const paidSubIds = new Set(payments.filter((p) => !p.revoked && isPaidStatus(p.status)).map((p) => p.subscriptionAsaasId))
    for (const sub of openSubs) {
      // Only drop subscriptions that never paid (or are overdue after suspension) — the lawyer pays anew
      if (paidSubIds.has(sub.asaasId) && profile.billingStatus !== "SUSPENDED") continue
      await deps.asaas.deleteSubscription(sub.asaasId)
      await prisma.billingSubscription.update({
        where: { id: sub.id },
        data: { status: "DELETED", canceledAt: new Date(), cancelReason: "trocou a forma de pagamento" },
      })
    }
  }

  // Only one open link per site: switching cycle closes the open link(s) of the other cycle, so the
  // lawyer can't end up paying both a monthly and a yearly subscription
  const otherLinks = await prisma.billingPaymentLink.findMany({
    where: { profileId, environment: env, status: "ACTIVE", cycle: { not: cycle } },
  })
  for (const other of otherLinks) {
    try {
      await deps.asaas.disablePaymentLink(other.asaasId, normalizeCycle(other.cycle))
    } catch (err) {
      console.error("[billing] falha ao desativar link do outro ciclo", { profileId, link: other.asaasId, err: String(err) })
      return NextResponse.json(
        { code: "GATEWAY_ERROR", error: "Não foi possível trocar o plano agora. Tente novamente em alguns minutos." },
        { status: 502 }
      )
    }
    await prisma.billingPaymentLink.update({ where: { id: other.id }, data: { status: "DISABLED", closedAt: new Date() } })
  }

  const billingType = "UNDEFINED"
  let link = await prisma.billingPaymentLink.findFirst({
    where: { profileId, environment: env, billingType, cycle, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  })
  if (!link) {
    let created: { id: string; url: string }
    try {
      created = await deps.asaas.createPaymentLink({ billingType, cycle, externalReference: profileId })
    } catch (err) {
      console.error("[billing] falha ao criar link de pagamento", { profileId, method, cycle, err: String(err) })
      trackEvent("checkout_failed", { userId, siteId: profileId, meta: { method, cycle, error: String(err).slice(0, 300) } }).catch(() => {})
      return NextResponse.json(
        { code: "GATEWAY_ERROR", error: "Não foi possível abrir o pagamento agora. Tente novamente em alguns minutos." },
        { status: 502 }
      )
    }
    link = await prisma.billingPaymentLink.create({
      data: { environment: env, asaasId: created.id, profileId, billingType, cycle, url: created.url },
    })
  }
  await recomputeProfile(deps, profileId)
  trackEvent("checkout_started", { userId, siteId: profileId, meta: { method, cycle } }).catch(() => {})

  return NextResponse.json({ url: link.url })
}
