export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { trackEvent } from "@/lib/product-events"
import { getBillingDeps } from "@/lib/billing/deps"
import { recomputeProfile } from "@/lib/billing/sync"
import { dbDateToCivil } from "@/lib/billing/civil-date"
import { notifyCancellationRequested } from "@/lib/billing/notify"

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(100),
  details: z.string().trim().max(1000).optional(),
})

/**
 * Cancels the subscription of the ACTIVE site only (BIL-1). The site stays published until the end of
 * the paid period; the sweep unpublishes it afterwards.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Informe o motivo do cancelamento." }, { status: 400 })

  const deps = getBillingDeps()
  if (!deps) return NextResponse.json({ error: "Pagamentos indisponíveis no momento." }, { status: 503 })

  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId }, select: { id: true } })
  if (!profile) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const openSubs = await prisma.billingSubscription.findMany({
    where: { profileId, environment: deps.asaas.environment, status: "ACTIVE" },
  })
  if (!openSubs.length) {
    return NextResponse.json({ code: "NO_SUBSCRIPTION", error: "Este site não tem assinatura ativa." }, { status: 404 })
  }

  const reason = parsed.data.details ? `${parsed.data.reason}: ${parsed.data.details}` : parsed.data.reason
  const now = new Date()
  for (const sub of openSubs) {
    await deps.asaas.deleteSubscription(sub.asaasId)
    await prisma.billingSubscription.update({
      where: { id: sub.id },
      data: { status: "DELETED", canceledAt: now, cancelReason: reason.slice(0, 1000) },
    })
  }
  const status = await recomputeProfile(deps, profileId)
  const updated = await prisma.profile.findUniqueOrThrow({ where: { id: profileId }, select: { paidUntil: true } })
  const activeUntil = status === "ACTIVE" || status === "GRACE" ? dbDateToCivil(updated.paidUntil) : null

  trackEvent("subscription_cancel_requested", { userId, siteId: profileId, meta: { reason: parsed.data.reason } }).catch(() => {})
  notifyCancellationRequested({ profileId, reason, activeUntil }).catch((err) =>
    console.error("[billing] falha ao avisar cancelamento", { profileId, err: String(err) })
  )

  return NextResponse.json({ ok: true, billingStatus: status, activeUntil })
}
