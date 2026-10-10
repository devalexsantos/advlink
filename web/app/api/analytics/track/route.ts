import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import geoip from "geoip-lite"
import { getClientIp, rateLimiters } from "@/lib/rate-limit"
import { BOT_UA_PATTERN, dailyVisitorHash } from "@/lib/visitor-hash"
import { isBeaconContactKind, type BeaconContactKind } from "@/lib/contact-clicks"

export const runtime = "nodejs"


function parseDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet"
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile"
  return "desktop"
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge"
  if (/opr|opera/i.test(ua)) return "Opera"
  if (/firefox/i.test(ua)) return "Firefox"
  if (/chrome|chromium|crios/i.test(ua)) return "Chrome"
  if (/safari/i.test(ua)) return "Safari"
  return "Outro"
}

function classifyReferrer(ref: string | null | undefined): string {
  if (!ref) return "Direto"
  const r = ref.toLowerCase()
  if (r.includes("google")) return "Google"
  if (r.includes("instagram")) return "Instagram"
  if (r.includes("facebook") || r.includes("fb.com")) return "Facebook"
  if (r.includes("whatsapp") || r.includes("wa.me")) return "WhatsApp"
  if (r.includes("linkedin")) return "LinkedIn"
  if (r.includes("bing")) return "Bing"
  if (r.includes("yahoo")) return "Yahoo"
  return "Outro"
}

const DEDUPE_WINDOW_MS = 30 * 60 * 1000


/**
 * Contact-click beacon ({ slug, type: "contact", kind }). LGPD: only aggregate counts are kept —
 * no phone number, destination URL or IP is stored; the daily visitor hash exists only to dedupe.
 */
async function trackContactClick(req: NextRequest, slug: string, kind: BeaconContactKind, ua: string) {
  const profile = await prisma.profile.findFirst({
    where: { slug },
    select: { id: true, isActive: true },
  })
  if (!profile) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
  // Unpublished sites are not public: don't count clicks on them.
  if (!profile.isActive) {
    return NextResponse.json({ ok: true })
  }

  const ip = getClientIp(req.headers)
  if (!rateLimiters.contactClickByIpSlug.check(`${ip}|${slug}`).ok) {
    return NextResponse.json({ ok: true })
  }
  const visitorHash = dailyVisitorHash(ip, ua)

  // Same visitor + channel on the same site within 30 min counts once.
  const recent = await prisma.contactClick.findFirst({
    where: {
      profileId: profile.id,
      visitorHash,
      kind,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  })
  if (recent) {
    return NextResponse.json({ ok: true })
  }

  await prisma.contactClick.create({
    data: { profileId: profile.id, kind, visitorHash },
  })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const { slug, referrer, path, type, kind } = await req.json()
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const isContact = type === "contact"
    // "form" is a valid ContactKind but is only recorded server-side by POST /api/leads.
    if (isContact && !isBeaconContactKind(kind)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const ua = req.headers.get("user-agent") || ""
    if (BOT_UA_PATTERN.test(ua)) {
      return NextResponse.json({ ok: true })
    }

    if (isContact) {
      return await trackContactClick(req, slug, kind, ua)
    }

    const profile = await prisma.profile.findFirst({
      where: { slug },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    // IP comes from the trusted proxy hop: the first X-Forwarded-For entry is client-controlled
    // and would let anyone fake unique visitors.
    const ip = getClientIp(req.headers)
    // Silently drop beacons over the limit (the client ignores the response anyway)
    if (!rateLimiters.analyticsByIpSlug.check(`${ip}|${slug}`).ok) {
      return NextResponse.json({ ok: true })
    }
    const visitorHash = dailyVisitorHash(ip, ua)

    // Deduplication: skip if same hash+profile in last 30 min
    const thirtyMinAgo = new Date(Date.now() - DEDUPE_WINDOW_MS)
    const recent = await prisma.pageView.findFirst({
      where: {
        profileId: profile.id,
        visitorHash,
        createdAt: { gte: thirtyMinAgo },
      },
      select: { id: true },
    })
    if (recent) {
      return NextResponse.json({ ok: true })
    }

    // Geo lookup via geoip-lite (local MaxMind database)
    const geo = ip !== "unknown" ? geoip.lookup(ip) : null
    const country = geo?.country || null
    const city = geo?.city || null
    const region = geo?.region || null

    await prisma.pageView.create({
      data: {
        profileId: profile.id,
        path: path || "/",
        referrer: classifyReferrer(referrer),
        userAgent: ua.slice(0, 512),
        country,
        city,
        region,
        deviceType: parseDevice(ua),
        browser: parseBrowser(ua),
        visitorHash,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
