export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getBillingDeps } from "@/lib/billing/deps"
import { reconcileProfile } from "@/lib/billing/sync"
import { dbDateToCivil } from "@/lib/billing/civil-date"

/** Minimum interval between Asaas lookups for the same site while the dashboard polls. */
const RECONCILE_INTERVAL_MS = 10_000
const lastReconcile = new Map<string, number>()

/**
 * Billing status of the active site. With ?refresh=1 (dashboard polling after the checkout) and a
 * pending checkout, it also asks Asaas directly, so publishing doesn't depend on the webhook (BIL-3).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const refresh = new URL(req.url).searchParams.get("refresh") === "1"
  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId }, select: { billingStatus: true } })
  if (!profile) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const deps = getBillingDeps()
  if (refresh && deps && profile.billingStatus === "PENDING") {
    const last = lastReconcile.get(profileId) ?? 0
    if (Date.now() - last >= RECONCILE_INTERVAL_MS) {
      lastReconcile.set(profileId, Date.now())
      try {
        await reconcileProfile(deps, profileId)
      } catch (err) {
        console.error("[billing] reconciliação falhou", { profileId, err: String(err) })
      }
    }
  }

  const [full, unpaid, openSub] = await Promise.all([
    prisma.profile.findUniqueOrThrow({
      where: { id: profileId },
      select: { billingStatus: true, isActive: true, suspendedByAdmin: true, paidUntil: true, graceUntil: true },
    }),
    prisma.billingPayment.findFirst({
      where: { profileId, revoked: false, status: { in: ["PENDING", "OVERDUE"] }, invoiceUrl: { not: null } },
      orderBy: { dueDate: "desc" },
      select: { invoiceUrl: true, dueDate: true, billingType: true, status: true },
    }),
    prisma.billingSubscription.findFirst({
      where: { profileId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, cycle: true },
    }),
  ])

  return NextResponse.json({
    billingStatus: full.billingStatus,
    published: full.isActive,
    suspendedByAdmin: full.suspendedByAdmin,
    paidUntil: dbDateToCivil(full.paidUntil),
    graceUntil: dbDateToCivil(full.graceUntil),
    renews: !!openSub,
    /** Cycle of the open subscription (MONTHLY | YEARLY), null without one */
    cycle: openSub?.cycle ?? null,
    pendingPayment: unpaid,
  })
}
