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
  const site = await prisma.profile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true, stripeCustomerId: true } },
    },
  })

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 })
  return NextResponse.json(site)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { isActive } = await req.json()

  const before = await prisma.profile.findUnique({ where: { id }, select: { isActive: true } })

  const profile = await prisma.profile.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  })

  await logAudit({
    adminUserId: admin.id,
    action: isActive ? "site_reactivated" : "site_suspended",
    entityType: "Profile",
    entityId: id,
    before,
    after: { isActive },
  })

  return NextResponse.json(profile)
}
