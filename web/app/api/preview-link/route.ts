export const runtime = "nodejs"
import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { trackEvent } from "@/lib/product-events"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"
import { getAppOrigin } from "@/lib/site-url"

const DAY_MS = 24 * 60 * 60 * 1000
const PREVIEW_LINK_TTL_MS = 7 * DAY_MS
/** An existing link is reused only while it still has at least this long to live. */
const MIN_REMAINING_TO_REUSE_MS = DAY_MS

function previewUrl(token: string) {
  return `${getAppOrigin()}/previa/${token}`
}

/**
 * Returns a shareable 7-day preview link for the active site (reusing a recent one).
 * Response: { url, expiresAt } — expiresAt as ISO string.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const limit = rateLimiters.previewLinkByUser.check(userId)
  if (!limit.ok) return rateLimitResponse(limit)

  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { suspendedByAdmin: true } })
  if (!profile) return NextResponse.json({ error: "No site found" }, { status: 404 })
  if (profile.suspendedByAdmin) {
    return NextResponse.json({ error: "Este site está suspenso e não pode ser compartilhado." }, { status: 403 })
  }

  const now = new Date()
  let link = await prisma.previewLink.findFirst({
    where: { profileId, expiresAt: { gt: new Date(now.getTime() + MIN_REMAINING_TO_REUSE_MS) } },
    orderBy: { expiresAt: "desc" },
    select: { token: true, expiresAt: true },
  })
  const reused = Boolean(link)
  if (!link) {
    // Housekeeping: expired links of this site are useless (the page treats them as missing)
    await prisma.previewLink.deleteMany({ where: { profileId, expiresAt: { lte: now } } })
    link = await prisma.previewLink.create({
      data: { profileId, token: randomBytes(24).toString("base64url"), expiresAt: new Date(now.getTime() + PREVIEW_LINK_TTL_MS) },
      select: { token: true, expiresAt: true },
    })
  }

  trackEvent("preview_shared", { userId, siteId: profileId, meta: { reused } }).catch(() => {})

  return NextResponse.json({ url: previewUrl(link.token), expiresAt: link.expiresAt.toISOString() })
}
