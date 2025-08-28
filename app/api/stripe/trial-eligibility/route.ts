import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // If user has no Stripe customer yet, they are eligible for trial
  if (!user.stripeCustomerId) {
    return NextResponse.json({ trialEligible: true })
  }

  // Check if any past subscription for this customer ever used a trial
  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 100,
  })

  const hasUsedTrial = subs.data.some((s) => Boolean(s.trial_start))

  return NextResponse.json({ trialEligible: !hasUsedTrial })
}

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"


