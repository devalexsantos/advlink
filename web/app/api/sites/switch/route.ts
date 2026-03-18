import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setActiveSiteCookie } from "@/lib/active-site"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const siteId = String(body.siteId ?? "")
  if (!siteId) return NextResponse.json({ error: "siteId é obrigatório" }, { status: 400 })

  // Validate ownership
  const profile = await prisma.profile.findFirst({
    where: { id: siteId, userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 })

  await setActiveSiteCookie(siteId)

  return NextResponse.json({ ok: true })
}
