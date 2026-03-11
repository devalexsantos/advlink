import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "Sem cliente Stripe" }, { status: 400 })

  const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 })
  const sub = subs.data.find((s) => s.cancel_at_period_end)
  if (!sub) return NextResponse.json({ error: "Nenhuma assinatura com cancelamento agendado" }, { status: 400 })

  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false })

  return NextResponse.json({ ok: true })
}


