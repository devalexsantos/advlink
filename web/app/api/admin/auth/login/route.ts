import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } })
  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
  }

  const token = await createAdminToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  })

  const res = NextResponse.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })

  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return res
}
