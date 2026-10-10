export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({ read: z.boolean() })

async function resolveSite(): Promise<{ error: NextResponse } | { profileId: string }> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const profileId = await getActiveSiteId(userId)
  if (!profileId) return { error: NextResponse.json({ error: "No site found" }, { status: 404 }) }
  return { profileId }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { id } = await params

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })

  const existing = await prisma.lead.findFirst({ where: { id, profileId: site.profileId }, select: { id: true, readAt: true } })
  if (!existing) return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 })

  // Keep the first read timestamp when marking an already-read lead as read again.
  const readAt = parsed.data.read ? (existing.readAt ?? new Date()) : null
  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: { readAt },
    select: { id: true, readAt: true },
  })
  return NextResponse.json({ lead })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { id } = await params

  const { count } = await prisma.lead.deleteMany({ where: { id, profileId: site.profileId } })
  if (count === 0) return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 })
  return NextResponse.json({ ok: true })
}
