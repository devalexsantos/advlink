import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { stripe } from "@/lib/stripe"

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // DB stats
  const [paying, trial, recentlyCancelled] = await Promise.all([
    prisma.user.count({ where: { isActive: true, stripeCustomerId: { not: null } } }),
    prisma.user.count({ where: { isActive: false, stripeCustomerId: null } }),
    prisma.user.count({
      where: { isActive: false, stripeCustomerId: { not: null }, updatedAt: { gte: thirtyDaysAgo } },
    }),
  ])

  // Stripe MRR from active subscriptions
  let mrr = 0
  let subscriptions: Array<{
    id: string
    customerEmail: string | null
    status: string
    amount: number
    currentPeriodEnd: number
  }> = []

  try {
    const subs = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    })

    for (const sub of subs.data) {
      const amount = sub.items.data.reduce((sum, item) => sum + (item.price?.unit_amount || 0), 0)
      mrr += amount
      const customer = sub.customer as { email?: string | null } | string
      subscriptions.push({
        id: sub.id,
        customerEmail: typeof customer === "object" ? customer?.email || null : null,
        status: sub.status,
        amount: amount / 100,
        currentPeriodEnd: sub.current_period_end,
      })
    }
  } catch {
    // Stripe may not be configured
  }

  return NextResponse.json({
    paying,
    trial,
    recentlyCancelled,
    mrr: mrr / 100,
    subscriptions,
  })
}
