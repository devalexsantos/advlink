import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit-log"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      activityAreas: { orderBy: { position: "asc" } },
      Links: true,
      address: true,
      tickets: { orderBy: { updatedAt: "desc" }, take: 10 },
    },
  })

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { isActive } = await req.json()

  const before = await prisma.user.findUnique({ where: { id }, select: { isActive: true } })
  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  })

  await logAudit({
    adminUserId: admin.id,
    action: isActive ? "user_activated" : "user_deactivated",
    entityType: "User",
    entityId: id,
    before: before,
    after: { isActive },
  })

  return NextResponse.json(user)
}
