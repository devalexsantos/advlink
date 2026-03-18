import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { getActiveSiteId } from "@/lib/active-site"

export const runtime = "nodejs"

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } }),
    prisma.profile.findUnique({ where: { id: profileId }, select: { stripeSubscriptionId: true } }),
  ])
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "Sem cliente Stripe" }, { status: 400 })

  // Find subscription with pending cancellation
  let sub: { id: string; cancel_at_period_end: boolean } | undefined
  if (profile?.stripeSubscriptionId) {
    try {
      const s = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId)
      if (s.cancel_at_period_end) sub = s
    } catch { /* ignore */ }
  }
  if (!sub) {
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 })
    sub = subs.data.find((s) => s.cancel_at_period_end)
  }
  if (!sub) return NextResponse.json({ error: "Nenhuma assinatura com cancelamento agendado" }, { status: 400 })

  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false })

  return NextResponse.json({ ok: true })
}
