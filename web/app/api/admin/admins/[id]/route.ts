import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit-log"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas super admins podem editar administradores" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, role, isActive } = body

  const before = await prisma.adminUser.findUnique({
    where: { id },
    select: { name: true, role: true, isActive: true },
  })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  await logAudit({
    adminUserId: admin.id,
    action: "admin_updated",
    entityType: "AdminUser",
    entityId: id,
    before,
    after: data,
  })

  return NextResponse.json(updated)
}
