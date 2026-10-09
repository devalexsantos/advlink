import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit-log"
import { isPublishedStatus } from "@/lib/billing/status"
import { recomputeProfile } from "@/lib/billing/sync"
import { billingEnvironment, safeBillingDeps } from "@/app/api/admin/_lib/billing"

const siteStateSelect = { isActive: true, suspendedByAdmin: true, billingStatus: true } as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const environment = billingEnvironment()
  const site = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      publicName: true,
      name: true,
      isActive: true,
      headline: true,
      avatarUrl: true,
      coverUrl: true,
      whatsapp: true,
      publicEmail: true,
      publicPhone: true,
      theme: true,
      primaryColor: true,
      secondaryColor: true,
      metaTitle: true,
      metaDescription: true,
      createdAt: true,
      updatedAt: true,
      billingStatus: true,
      paidUntil: true,
      graceUntil: true,
      suspendedByAdmin: true,
      churnedAt: true,
      user: { select: { id: true, name: true, email: true, isActive: true } },
      billingSubscriptions: {
        where: { environment },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, valueCents: true, billingType: true, nextDueDate: true, canceledAt: true, cancelReason: true },
      },
      billingPayments: {
        where: { environment },
        orderBy: { dueDate: "desc" },
        take: 5,
        select: { id: true, status: true, valueCents: true, billingType: true, dueDate: true, paymentDate: true, revoked: true, invoiceUrl: true },
      },
    },
  })

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 })
  return NextResponse.json(site)
}

const patchSchema = z.object({ suspended: z.boolean() })

/**
 * Suspends / reactivates a site by the team (BIL-10). The block lives in `suspendedByAdmin`, separate
 * from billing, so a webhook or the sweep never undoes it; `isActive` (published) is then derived:
 * - sites with Asaas billing: `recomputeProfile` (published = ACTIVE|GRACE && !suspendedByAdmin);
 * - legacy sites (billingStatus NONE, no billing rows): the admin toggle still publishes/unpublishes.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Envie { suspended: boolean }" }, { status: 400 })
  }
  const { suspended } = parsed.data

  const before = await prisma.profile.findUnique({ where: { id }, select: siteStateSelect })
  if (!before) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 })

  const deps = safeBillingDeps()
  const environment = deps?.asaas.environment ?? "PRODUCTION"
  const legacy = before.billingStatus === "NONE" && !(await hasBillingRows(id, environment))

  // Suspension always unpublishes right away; reactivation of a billed site waits for the recompute
  await prisma.profile.update({
    where: { id },
    data: {
      suspendedByAdmin: suspended,
      ...(suspended ? { isActive: false } : legacy ? { isActive: true } : {}),
    },
  })

  if (!legacy) {
    let recomputed = false
    if (deps) {
      try {
        recomputed = (await recomputeProfile(deps, id)) !== null
      } catch (err) {
        console.error("[admin] recomputeProfile falhou na suspensão/reativação", { profileId: id, err: String(err) })
      }
    }
    if (!recomputed) {
      // No Asaas client (or it failed): derive from the stored billing status
      await prisma.profile.update({
        where: { id },
        data: { isActive: !suspended && isPublishedStatus(before.billingStatus) },
      })
    }
  }

  const after = await prisma.profile.findUnique({ where: { id }, select: { id: true, ...siteStateSelect } })

  await logAudit({
    adminUserId: admin.id,
    action: suspended ? "site_suspended" : "site_reactivated",
    entityType: "Profile",
    entityId: id,
    before,
    after: after ? { isActive: after.isActive, suspendedByAdmin: after.suspendedByAdmin, billingStatus: after.billingStatus } : null,
  })

  return NextResponse.json(after)
}

async function hasBillingRows(profileId: string, environment: string): Promise<boolean> {
  const [subscriptions, payments, links] = await Promise.all([
    prisma.billingSubscription.count({ where: { profileId, environment } }),
    prisma.billingPayment.count({ where: { profileId, environment } }),
    prisma.billingPaymentLink.count({ where: { profileId, environment, status: "ACTIVE" } }),
  ])
  return subscriptions + payments + links > 0
}
