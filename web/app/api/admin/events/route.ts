import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const userId = searchParams.get("userId")
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const perPage = 30

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (userId) where.userId = userId

  const [events, total, typeCounts] = await Promise.all([
    prisma.productEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.productEvent.count({ where }),
    prisma.productEvent.groupBy({
      by: ["type"],
      _count: { type: true },
      orderBy: { _count: { type: "desc" } },
    }),
  ])

  // Enrich events with user data
  const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))] as string[]
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enrichedEvents = events.map((e) => ({
    ...e,
    user: e.userId ? userMap.get(e.userId) || null : null,
  }))

  const stats = typeCounts.map((t) => ({
    type: t.type,
    count: t._count.type,
  }))

  return NextResponse.json({ events: enrichedEvents, total, page, perPage, stats })
}
