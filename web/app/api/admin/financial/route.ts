import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import {
  PAID_BILLING_STATUSES,
  PAID_PAYMENT_STATUSES,
  billingEnvironment,
  canceledSitesWhere,
  currentMonthRange,
} from "@/app/api/admin/_lib/billing"
import { monthlyEquivalentCents } from "@/lib/billing/plan"

export const dynamic = "force-dynamic"

const PER_PAGE = 20

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
})

/**
 * Financial KPIs per site, from the local billing mirror (BIL-11). Only rows of the configured Asaas
 * environment count, so sandbox tests never leak into production numbers.
 */
export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { page } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams))
  const environment = billingEnvironment()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const month = currentMonthRange(now)

  const [byStatus, recentlyCancelled, mrrByCycle, monthRevenue, subscriptions, totalSubscriptions] = await Promise.all([
    prisma.profile.groupBy({ by: ["billingStatus"], _count: { _all: true } }),
    prisma.profile.count({ where: canceledSitesWhere(environment, { gte: thirtyDaysAgo }) }),
    // Per cycle: a yearly subscription contributes 1/12 of its value to the MRR
    prisma.billingSubscription.groupBy({
      by: ["cycle"],
      where: { environment, status: "ACTIVE", profile: { billingStatus: { in: PAID_BILLING_STATUSES } } },
      _sum: { valueCents: true },
    }),
    prisma.billingPayment.aggregate({
      where: {
        environment,
        status: { in: PAID_PAYMENT_STATUSES },
        revoked: false,
        paymentDate: { gte: month.first, lte: month.last },
      },
      _sum: { valueCents: true, netValueCents: true },
      _count: { _all: true },
    }),
    prisma.billingSubscription.findMany({
      where: { environment },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        status: true,
        valueCents: true,
        cycle: true,
        billingType: true,
        nextDueDate: true,
        canceledAt: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            slug: true,
            publicName: true,
            name: true,
            billingStatus: true,
            paidUntil: true,
            suspendedByAdmin: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.billingSubscription.count({ where: { environment } }),
  ])

  const mrrCents = mrrByCycle.reduce((sum, g) => sum + monthlyEquivalentCents(g._sum.valueCents ?? 0, g.cycle), 0)
  const count = (status: string) => byStatus.find((g) => g.billingStatus === status)?._count._all ?? 0

  return NextResponse.json({
    environment,
    paying: count("ACTIVE") + count("GRACE"),
    overdue: count("GRACE"),
    delinquent: count("SUSPENDED"),
    pending: count("PENDING"),
    recentlyCancelled,
    mrrCents,
    monthRevenueCents: monthRevenue._sum.valueCents ?? 0,
    monthNetRevenueCents: monthRevenue._sum.netValueCents ?? 0,
    monthPayments: monthRevenue._count._all,
    subscriptions,
    total: totalSubscriptions,
    page,
    perPage: PER_PAGE,
  })
}
