import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const priceId = process.env.STRIPE_PRICE_ID || ""
  if (!priceId) return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 })

  // Ensure we have or create a Stripe customer for this user
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, stripeCustomerId: true } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  let customerId = user.stripeCustomerId || undefined
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email || undefined, metadata: { userId } })
    customerId = customer.id
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
  }

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000"
  const successUrl = `${origin}/profile/edit?success=1`
  const cancelUrl = `${origin}/profile/edit?canceled=1`

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      trial_period_days: 7,
    }
  })

  return NextResponse.json({ url: checkout.url })
}


