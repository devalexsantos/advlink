import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const perPage = 20

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { slug: { contains: search, mode: "insensitive" } },
      { publicName: { contains: search, mode: "insensitive" } },
    ]
  }

  const [sites, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.profile.count({ where }),
  ])

  return NextResponse.json({ sites, total, page, perPage })
}
