import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ valid: false, message: "Unauthorized" }, { status: 401 })

  const { slug } = await req.json()
  const normalized = String(slug ?? "")
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60)

  if (!normalized) return NextResponse.json({ valid: false, message: "Slug inválido" }, { status: 400 })

  const exists = await prisma.profile.findFirst({ where: { slug: normalized, NOT: { userId } }, select: { id: true } })
  return NextResponse.json({ valid: !exists, slug: normalized })
}


