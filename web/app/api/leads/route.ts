export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { checkAll, getClientIp, rateLimitResponse, rateLimiters } from "@/lib/rate-limit"
import { BOT_UA_PATTERN, dailyVisitorHash } from "@/lib/visitor-hash"
import { LEAD_MIN_FILL_MS, LEAD_RETENTION_DAYS, leadSchema } from "@/lib/leads"
import { getResend, EMAIL_FROM } from "@/lib/resend"
import { buildLeadEmail } from "@/lib/emails/leadEmails"
import { getAppOrigin } from "@/lib/site-url"
import { trackEvent } from "@/lib/product-events"

const NOT_FOUND = { error: "Formulário de contato indisponível." }

/** Bot traps: filled honeypot or a submission faster than a human could type. Missing timer = bot. */
function looksAutomated(body: Record<string, unknown>): boolean {
  const honeypot = body.website
  if (typeof honeypot === "string" ? honeypot.trim() !== "" : honeypot != null) return true
  const startedAt = Number(body.startedAt)
  if (!Number.isFinite(startedAt)) return true
  return Date.now() - startedAt < LEAD_MIN_FILL_MS
}

/**
 * Public pre-intake contact form. LGPD: AdvLink stores the message as operator on behalf of the
 * lawyer (controller), on the visitor's explicit consent, and purges it after LEAD_RETENTION_DAYS.
 */
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null)
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }
  const body = raw as Record<string, unknown>

  const ua = req.headers.get("user-agent") || ""
  // Silent success so bots get no signal that they were filtered.
  if (BOT_UA_PATTERN.test(ua) || looksAutomated(body)) {
    return NextResponse.json({ ok: true })
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : ""
  if (!slug || slug.length > 100) return NextResponse.json(NOT_FOUND, { status: 404 })

  const ip = getClientIp(req.headers)
  const blocked = checkAll([
    [rateLimiters.leadByIpSlug, `${ip}|${slug}`],
    [rateLimiters.leadByIp, ip],
  ])
  if (blocked) return rateLimitResponse(blocked)

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      isActive: true,
      leadFormEnabled: true,
      publicName: true,
      user: { select: { email: true } },
    },
  })
  if (!profile || !profile.isActive || !profile.leadFormEnabled) {
    return NextResponse.json(NOT_FOUND, { status: 404 })
  }

  const parsed = leadSchema.safeParse({ ...body, slug })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const data = parsed.data

  await prisma.$transaction([
    prisma.lead.create({
      data: {
        profileId: profile.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        areaTitle: data.area,
        message: data.message,
        consentAt: new Date(),
      },
    }),
    // Counted with the other contact channels; recorded server-side only (the beacon rejects "form").
    prisma.contactClick.create({
      data: { profileId: profile.id, kind: "form", visitorHash: dailyVisitorHash(ip, ua) },
    }),
  ])

  await notifyOwner(profile.user?.email ?? null, {
    siteName: profile.publicName || slug,
    name: data.name,
    email: data.email,
    phone: data.phone,
    areaTitle: data.area,
    message: data.message,
  })

  trackEvent("lead_received", { userId: profile.userId, siteId: profile.id }).catch(() => {})

  return NextResponse.json({ ok: true }, { status: 201 })
}

async function notifyOwner(
  to: string | null,
  lead: { siteName: string; name: string; email: string | null; phone: string | null; areaTitle: string | null; message: string },
) {
  if (!to) return
  try {
    const resend = getResend()
    if (!resend) return
    const { subject, html } = buildLeadEmail({
      ...lead,
      inboxUrl: `${getAppOrigin()}/profile/contatos`,
      retentionDays: LEAD_RETENTION_DAYS,
    })
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      ...(lead.email ? { replyTo: lead.email } : {}),
    })
    if (result?.error) console.error("[leads] falha ao enviar e-mail de novo contato", result.error)
  } catch (err) {
    // The lead is already saved and visible in the dashboard; e-mail is best effort.
    console.error("[leads] falha ao enviar e-mail de novo contato", err)
  }
}

const LIST_LIMIT = 500

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const [leads, unread] = await Promise.all([
    prisma.lead.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: { id: true, name: true, email: true, phone: true, areaTitle: true, message: true, createdAt: true, readAt: true },
    }),
    prisma.lead.count({ where: { profileId, readAt: null } }),
  ])

  return NextResponse.json({ leads, unread })
}
