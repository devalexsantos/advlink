export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getEasypanel } from "@/lib/easypanel"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"
import {
  checkDns,
  checkHttps,
  clearCustomHostCache,
  describeDnsProblems,
  dnsOk,
  isCustomDomainConfigured,
  toCustomDomainDto,
} from "@/lib/custom-domain"

const CERT_PENDING = "Certificado sendo emitido, tente novamente em alguns minutos."
const PROVISION_FAILED = "Não foi possível registrar o domínio no servidor. Tente novamente em alguns minutos."

/**
 * Advances the site's custom domain one step: DNS check → register on Easypanel (provisioning)
 * → HTTPS check → active. Idempotent; the UI calls it from the "Verificar" button.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const limited = rateLimiters.customDomainVerifyByUser.check(userId)
  if (!limited.ok) return rateLimitResponse(limited)

  const easypanel = getEasypanel()
  if (!easypanel || !isCustomDomainConfigured()) {
    return NextResponse.json({ error: "Domínio próprio indisponível no momento" }, { status: 503 })
  }

  const [profile, domain] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId }, select: { isActive: true } }),
    prisma.customDomain.findUnique({ where: { profileId } }),
  ])
  if (!profile?.isActive) {
    return NextResponse.json({ error: "Publique o site antes de conectar o domínio" }, { status: 409 })
  }
  if (!domain) return NextResponse.json({ error: "Nenhum domínio cadastrado" }, { status: 404 })
  if (domain.status === "active") return NextResponse.json({ domain: toCustomDomainDto(domain) })

  const now = new Date()
  const save = async (data: { status: string; error: string | null; easypanelDomainId?: string; activatedAt?: Date }) => {
    const updated = await prisma.customDomain.update({ where: { profileId }, data: { ...data, lastCheckedAt: now } })
    if (updated.status !== domain.status) clearCustomHostCache()
    return updated
  }

  const dns = await checkDns(domain.host, domain.verifyToken)
  if (!dnsOk(dns)) {
    const updated = await save({ status: "pending_dns", error: describeDnsProblems(domain.host, dns) })
    return NextResponse.json({ domain: toCustomDomainDto(updated) })
  }

  let current = domain
  if (!current.easypanelDomainId) {
    try {
      const registered = (await easypanel.findDomainByHost(current.host)) ?? (await easypanel.createDomain(current.host))
      current = await save({ status: "provisioning", error: null, easypanelDomainId: registered.id })
    } catch (err) {
      console.error("[custom-domain] createDomain falhou", { profileId, host: current.host, error: (err as Error).message })
      const updated = await save({ status: "error", error: PROVISION_FAILED })
      return NextResponse.json({ domain: toCustomDomainDto(updated) })
    }
  }

  const live = await checkHttps(current.host, profileId)
  const updated = live
    ? await save({ status: "active", error: null, activatedAt: now })
    : await save({ status: "provisioning", error: CERT_PENDING })
  return NextResponse.json({ domain: toCustomDomainDto(updated) })
}
