import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit-log"
import bcrypt from "bcryptjs"

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const admins = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { assignedTickets: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(admins)
}

export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas super admins podem criar administradores" }, { status: 403 })
  }

  const { email, name, password, role } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newAdmin = await prisma.adminUser.create({
    data: { email, name, passwordHash, role: role || "admin" },
    select: { id: true, email: true, name: true, role: true },
  })

  await logAudit({
    adminUserId: admin.id,
    action: "admin_created",
    entityType: "AdminUser",
    entityId: newAdmin.id,
    after: { email, name, role: role || "admin" },
  })

  return NextResponse.json(newAdmin, { status: 201 })
}
