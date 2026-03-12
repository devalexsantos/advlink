import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get("adminId")
  const entityType = searchParams.get("entityType")
  const action = searchParams.get("action")
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const perPage = 30

  const where: Record<string, unknown> = {}
  if (adminId) where.adminUserId = adminId
  if (entityType) where.entityType = entityType
  if (action) where.action = { contains: action, mode: "insensitive" }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { adminUser: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, perPage })
}
