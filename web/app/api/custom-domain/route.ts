export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getEasypanel } from "@/lib/easypanel"
import {
  clearCustomHostCache,
  generateVerifyToken,
  isCustomDomainConfigured,
  normalizeHost,
  toCustomDomainDto,
} from "@/lib/custom-domain"

const putSchema = z.object({ host: z.string().min(1).max(300) })

async function resolveSite(): Promise<{ error: NextResponse } | { profileId: string }> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const profileId = await getActiveSiteId(userId)
  if (!profileId) return { error: NextResponse.json({ error: "No site found" }, { status: 404 }) }
  return { profileId }
}

/** Removes the site's domain from Easypanel; false when that isn't possible right now. */
async function removeFromEasypanel(easypanelDomainId: string | null): Promise<boolean> {
  if (!easypanelDomainId) return true
  const easypanel = getEasypanel()
  if (!easypanel) return false
  try {
    await easypanel.deleteDomain(easypanelDomainId)
    return true
  } catch (err) {
    console.error("[custom-domain] deleteDomain falhou", { easypanelDomainId, error: (err as Error).message })
    return false
  }
}

const EASYPANEL_UNAVAILABLE = "Não foi possível remover o domínio anterior do servidor. Tente novamente em alguns minutos."

export async function GET() {
  const site = await resolveSite()
  if ("error" in site) return site.error

  const domain = await prisma.customDomain.findUnique({ where: { profileId: site.profileId } })
  return NextResponse.json({
    domain: domain ? toCustomDomainDto(domain) : null,
    configured: isCustomDomainConfigured(),
  })
}

export async function PUT(req: Request) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { profileId } = site

  const parsed = putSchema.safeParse(await req.json().catch(() => null))
  const host = parsed.success ? normalizeHost(parsed.data.host) : null
  if (!host) return NextResponse.json({ error: "Domínio inválido" }, { status: 400 })

  const [taken, current] = await Promise.all([
    prisma.customDomain.findUnique({ where: { host }, select: { profileId: true } }),
    prisma.customDomain.findUnique({ where: { profileId } }),
  ])
  if (taken && taken.profileId !== profileId) {
    return NextResponse.json({ error: "Este domínio já está em uso" }, { status: 409 })
  }
  // Same host again: keep the token so DNS records already created stay valid
  if (current && current.host === host) {
    return NextResponse.json({ domain: toCustomDomainDto(current) })
  }

  if (current && !(await removeFromEasypanel(current.easypanelDomainId))) {
    return NextResponse.json({ error: EASYPANEL_UNAVAILABLE }, { status: 502 })
  }

  const fresh = {
    host,
    status: "pending_dns",
    verifyToken: generateVerifyToken(),
    easypanelDomainId: null,
    error: null,
    activatedAt: null,
    lastCheckedAt: null,
  }
  try {
    const domain = await prisma.customDomain.upsert({
      where: { profileId },
      create: { profileId, ...fresh },
      update: fresh,
    })
    clearCustomHostCache()
    return NextResponse.json({ domain: toCustomDomainDto(domain) })
  } catch (err) {
    // Another site claimed the host between the check and the write
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Este domínio já está em uso" }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE() {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { profileId } = site

  const current = await prisma.customDomain.findUnique({ where: { profileId } })
  if (!current) return NextResponse.json({ ok: true })

  if (!(await removeFromEasypanel(current.easypanelDomainId))) {
    return NextResponse.json({ error: EASYPANEL_UNAVAILABLE }, { status: 502 })
  }
  await prisma.customDomain.deleteMany({ where: { profileId } })
  clearCustomHostCache()
  return NextResponse.json({ ok: true })
}
