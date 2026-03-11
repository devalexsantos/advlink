import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const profile = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get("days")) || 30, 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const profileId = profile.id

  const baseWhere = { profileId, createdAt: { gte: since } }

  const [
    totalViews,
    uniqueResult,
    sources,
    devices,
    browsers,
    countries,
    cities,
    hourlyResult,
    dailyResult,
  ] = await Promise.all([
    // Total views
    prisma.pageView.count({ where: baseWhere }),

    // Unique visitors (distinct visitor_hash)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT visitor_hash) as count
      FROM "PageView"
      WHERE "profileId" = ${profileId} AND "createdAt" >= ${since}
    `,

    // Sources
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: baseWhere,
      _count: true,
      orderBy: { _count: { referrer: "desc" } },
    }),

    // Devices
    prisma.pageView.groupBy({
      by: ["deviceType"],
      where: baseWhere,
      _count: true,
      orderBy: { _count: { deviceType: "desc" } },
    }),

    // Browsers
    prisma.pageView.groupBy({
      by: ["browser"],
      where: baseWhere,
      _count: true,
      orderBy: { _count: { browser: "desc" } },
    }),

    // Countries (top 10)
    prisma.pageView.groupBy({
      by: ["country"],
      where: { ...baseWhere, country: { not: null } },
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),

    // Cities (top 10)
    prisma.pageView.groupBy({
      by: ["city"],
      where: { ...baseWhere, city: { not: null } },
      _count: true,
      orderBy: { _count: { city: "desc" } },
      take: 10,
    }),

    // Hourly distribution
    prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::bigint as count
      FROM "PageView"
      WHERE "profileId" = ${profileId} AND "createdAt" >= ${since}
      GROUP BY hour
      ORDER BY hour
    `,

    // Daily views
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as day, COUNT(*)::bigint as count
      FROM "PageView"
      WHERE "profileId" = ${profileId} AND "createdAt" >= ${since}
      GROUP BY day
      ORDER BY day
    `,
  ])

  return NextResponse.json({
    totalViews,
    uniqueVisitors: Number(uniqueResult[0]?.count ?? 0),
    sources: sources.map((s) => ({ source: s.referrer || "Direto", count: s._count })),
    devices: devices.map((d) => ({ type: d.deviceType || "desktop", count: d._count })),
    browsers: browsers.map((b) => ({ name: b.browser || "Outro", count: b._count })),
    countries: countries.map((c) => ({ country: c.country || "Desconhecido", count: c._count })),
    cities: cities.map((c) => ({ city: c.city || "Desconhecida", count: c._count })),
    hourly: hourlyResult.map((h) => ({ hour: h.hour, count: Number(h.count) })),
    daily: dailyResult.map((d) => ({ day: d.day, count: Number(d.count) })),
    period: days,
  })
}
