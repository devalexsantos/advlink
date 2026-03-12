import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"
import { trackEvent } from "@/lib/product-events"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get("stripe-signature") || ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return new NextResponse(`Webhook Error: ${msg}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId: string | undefined = (session.customer as string | undefined) || undefined
        const email: string | undefined = session.customer_details?.email || (session.client_reference_id as string | undefined) || undefined
        if (!customerId) break

        let linkedUserId: string | undefined
        if (email) {
          // Link by email if possible
          const user = await prisma.user.upsert({
            where: { email },
            update: { stripeCustomerId: customerId, isActive: true },
            create: { email, stripeCustomerId: customerId, isActive: true },
          })
          linkedUserId = user.id
        } else if (session.metadata && (session.metadata as Record<string,string | undefined>).userId) {
          const userId = String((session.metadata as Record<string,string | undefined>).userId)
          await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId, isActive: true } })
          linkedUserId = userId
        }
        trackEvent("subscription_started", { userId: linkedUserId, meta: { customerId } }).catch(() => {})
        // Also track site_published if user has a profile
        if (linkedUserId) {
          prisma.profile.findUnique({ where: { userId: linkedUserId }, select: { slug: true } })
            .then((profile) => {
              if (profile?.slug) {
                trackEvent("site_published", { userId: linkedUserId, meta: { slug: profile.slug } }).catch(() => {})
              }
            })
            .catch(() => {})
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const customerId: string = String(sub.customer)
        const status: string = String(sub.status)
        const active = status === "active" || status === "trialing" || status === "past_due"
        await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data: { isActive: active } })
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId: string = String(sub.customer)
        await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data: { isActive: false } })
        break
      }
      default:
        // Ignore unconfigured events
        break
    }
  } catch (err) {
    return NextResponse.json({ received: true, error: true }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"


