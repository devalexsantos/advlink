import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setActiveSiteCookie } from "@/lib/active-site"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await prisma.profile.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      publicName: true,
      slug: true,
      isActive: true,
      setupComplete: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ sites })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const name = String(body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const site = await prisma.profile.create({
    data: {
      userId,
      name,
      setupComplete: false,
      isActive: false,
    },
  })

  await setActiveSiteCookie(site.id)

  return NextResponse.json({ site })
}
