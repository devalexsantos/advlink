import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import geoip from "geoip-lite"

export const runtime = "nodejs"

const BOT_PATTERN = /bot|crawler|spider|lighthouse|headless|prerender|wget|curl|httpie/i

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

export async function POST(req: NextRequest) {
  try {
    const { slug, referrer, path } = await req.json()
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const ua = req.headers.get("user-agent") || ""
    if (BOT_PATTERN.test(ua)) {
      return NextResponse.json({ ok: true })
    }

    const profile = await prisma.profile.findFirst({
      where: { slug },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    // Visitor hash: SHA-256(IP + UA + date) truncated
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const today = new Date().toISOString().slice(0, 10)
    const visitorHash = crypto
      .createHash("sha256")
      .update(`${ip}|${ua}|${today}`)
      .digest("hex")
      .slice(0, 16)

    // Deduplication: skip if same hash+profile in last 30 min
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
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
