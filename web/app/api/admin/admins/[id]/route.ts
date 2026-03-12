import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
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
  const { name, role, isActive, password } = body

  const before = await prisma.adminUser.findUnique({
    where: { id },
    select: { name: true, role: true, isActive: true },
  })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres" }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (password !== undefined) {
    await logAudit({
      adminUserId: admin.id,
      action: "admin_password_changed",
      entityType: "AdminUser",
      entityId: id,
    })
  }

  if (name !== undefined || role !== undefined || isActive !== undefined) {
    await logAudit({
      adminUserId: admin.id,
      action: "admin_updated",
      entityType: "AdminUser",
      entityId: id,
      before,
      after: { name: data.name, role: data.role, isActive: data.isActive },
    })
  }

  return NextResponse.json(updated)
}
