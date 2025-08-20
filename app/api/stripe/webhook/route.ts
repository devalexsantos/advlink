import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get("stripe-signature") || ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

  let event: Stripe.Event
  try {
    // @ts-expect-error type provided at runtime
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return new NextResponse(`Webhook Error: ${msg}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const customerId: string | undefined = session.customer as string | undefined
        const email: string | undefined = session.customer_details?.email || session.client_reference_id || undefined
        if (!customerId) break

        if (email) {
          // Link by email if possible
          await prisma.user.upsert({
            where: { email },
            update: { stripeCustomerId: customerId, isActive: true },
            create: { email, stripeCustomerId: customerId, isActive: true },
          })
        } else if (session.metadata?.userId) {
          const userId = String(session.metadata.userId)
          await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId, isActive: true } })
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any
        const customerId: string = sub.customer
        const status: string = sub.status
        const active = status === "active" || status === "trialing" || status === "past_due"
        await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data: { isActive: active } })
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any
        const customerId: string = sub.customer
        await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data: { isActive: false } })
        break
      }
      default:
        // Ignore unconfigured events
        break
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err)
    return NextResponse.json({ received: true, error: true }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"


