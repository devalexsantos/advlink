import type { PrismaClient } from "@prisma/client"
import type { ActivationEmailKind } from "@/lib/emails/activationEmails"

const HOUR = 3600_000
const DAY = 24 * HOUR

export const DEFAULT_BATCH_LIMIT = 200

/** [min age, max age) after signup, in ms, for the kinds sent to users who have not published. */
const SIGNUP_WINDOWS: Record<"welcome" | "checklist" | "oab_tips" | "last_reminder", [number, number]> = {
  welcome: [1 * HOUR, 3 * DAY],
  checklist: [1 * DAY, 3 * DAY],
  oab_tips: [3 * DAY, 5 * DAY],
  last_reminder: [7 * DAY, 9 * DAY],
}
/** share_kit: [min, max) after the oldest firstPublishedAt. */
const SHARE_WINDOW: [number, number] = [1 * DAY, 7 * DAY]

export interface ActivationRecipient {
  userId: string
  email: string
  name: string | null
  kind: ActivationEmailKind
  siteId: string | null
  siteSlug: string | null
}

export type ActivationSend = (recipient: ActivationRecipient) => Promise<void>
export type ActivationCounts = Record<ActivationEmailKind, number>

interface RunOptions {
  now: Date
  prisma: Pick<PrismaClient, "user" | "emailSend">
  send: ActivationSend
  limit?: number
}

const emptyCounts = (): ActivationCounts => ({ welcome: 0, checklist: 0, oab_tips: 0, last_reminder: 0, share_kit: 0 })

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002"
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  emailSends: { select: { kind: true } },
  profiles: { select: { id: true, slug: true, isActive: true, firstPublishedAt: true } },
} as const

/**
 * Sends the activation e-mails that are due. Only accounts created on/after ACTIVATION_DRIP_START
 * are eligible (without the env nothing is sent, so old accounts are never mass-mailed).
 */
export async function runActivationDrip({ now, prisma, send, limit = DEFAULT_BATCH_LIMIT }: RunOptions): Promise<ActivationCounts> {
  const counts = emptyCounts()
  const startRaw = process.env.ACTIVATION_DRIP_START
  const start = startRaw ? new Date(startRaw) : null
  if (!start || Number.isNaN(start.getTime())) {
    console.warn("[activation] ACTIVATION_DRIP_START ausente ou inválida; nada será enviado")
    return counts
  }

  const base = { marketingEmailsOptOutAt: null, email: { not: null } }
  const t = now.getTime()
  const signupFrom = new Date(Math.max(start.getTime(), t - SIGNUP_WINDOWS.last_reminder[1]))

  const [signupUsers, publishedUsers] = await Promise.all([
    prisma.user.findMany({
      where: { ...base, createdAt: { gte: signupFrom, lte: new Date(t - SIGNUP_WINDOWS.welcome[0]) } },
      select: userSelect,
      orderBy: { createdAt: "asc" },
      take: 1000,
    }),
    prisma.user.findMany({
      where: {
        ...base,
        createdAt: { gte: start },
        profiles: {
          some: { firstPublishedAt: { gte: new Date(t - SHARE_WINDOW[1]), lte: new Date(t - SHARE_WINDOW[0]) } },
        },
      },
      select: userSelect,
      take: 1000,
    }),
  ])

  type U = (typeof signupUsers)[number]
  const due: Array<{ user: U; kind: ActivationEmailKind; siteId: string | null; siteSlug: string | null }> = []

  for (const user of signupUsers) {
    const age = t - user.createdAt.getTime()
    const inWindow = (k: keyof typeof SIGNUP_WINDOWS) => age >= SIGNUP_WINDOWS[k][0] && age < SIGNUP_WINDOWS[k][1]
    const published = user.profiles.some((pr) => pr.isActive || pr.firstPublishedAt)
    if (inWindow("welcome")) due.push({ user, kind: "welcome", siteId: null, siteSlug: null })
    if (published) continue
    for (const kind of ["checklist", "oab_tips", "last_reminder"] as const) {
      if (inWindow(kind)) due.push({ user, kind, siteId: null, siteSlug: null })
    }
  }

  for (const user of publishedUsers) {
    const published = user.profiles
      .filter((pr) => pr.firstPublishedAt)
      .sort((a, b) => a.firstPublishedAt!.getTime() - b.firstPublishedAt!.getTime())
    const oldest = published[0]
    if (!oldest) continue
    const age = t - oldest.firstPublishedAt!.getTime()
    if (age >= SHARE_WINDOW[0] && age < SHARE_WINDOW[1]) {
      due.push({ user, kind: "share_kit", siteId: oldest.id, siteSlug: oldest.slug })
    }
  }

  let attempts = 0
  for (const { user, kind, siteId, siteSlug } of due) {
    if (attempts >= limit) break
    if (!user.email || user.emailSends.some((s) => s.kind === kind)) continue
    attempts++
    let recordId: string
    try {
      const rec = await prisma.emailSend.create({ data: { userId: user.id, kind, siteId }, select: { id: true } })
      recordId = rec.id
    } catch (e) {
      if (isUniqueViolation(e)) continue
      throw e
    }
    try {
      await send({ userId: user.id, email: user.email, name: user.name, kind, siteId, siteSlug })
      counts[kind]++
    } catch (e) {
      console.error("[activation] falha ao enviar", kind, e)
      await prisma.emailSend.delete({ where: { id: recordId } }).catch(console.error)
    }
  }
  return counts
}
