import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const now = new Date()

  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : now

  const dateRange = { gte: from, lte: to }

  const [
    totalUsers,
    newUsers,
    totalSites,
    publishedSites,
    openTickets,
    activeSubscriptions,
    recentCancellations,
    latestUsers,
    latestSites,
    recentTickets,
    unansweredTickets,
  ] = await Promise.all([
    // Global totals (no date filter)
    prisma.user.count(),
    // Temporal (with date filter)
    prisma.user.count({ where: { createdAt: dateRange } }),
    prisma.profile.count(),
    prisma.profile.count({ where: { isActive: true } }),
    prisma.ticket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.profile.count({ where: { isActive: true, stripeSubscriptionId: { not: null } } }),
    prisma.profile.count({
      where: {
        isActive: false,
        stripeSubscriptionId: { not: null },
        updatedAt: dateRange,
      },
    }),
    prisma.user.findMany({
      where: { createdAt: dateRange },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, isActive: true },
    }),
    prisma.profile.findMany({
      where: { createdAt: dateRange },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.ticket.findMany({
      where: { updatedAt: dateRange },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.ticket.findMany({
      where: {
        status: "open",
        messages: { none: { senderType: "admin" } },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  return NextResponse.json({
    totalUsers,
    newUsers,
    totalSites,
    publishedSites,
    openTickets,
    activeSubscriptions,
    recentCancellations,
    latestUsers,
    latestSites,
    recentTickets,
    unansweredTickets,
  })
}
