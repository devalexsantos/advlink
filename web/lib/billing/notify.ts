import { prisma } from "@/lib/prisma"
import type { BillingNotification } from "./sync"
import { normalizeCycle } from "./plan"
import { activeHostOf } from "@/lib/site-url"
import {
  sendBillingEmail,
  sendCancellationConfirmationEmail,
  sendCancellationTeamEmail,
} from "@/lib/emails/billingEmails"

const DEFAULT_TEAM_EMAIL = "advlinkcontato@gmail.com"

async function loadOwner(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      slug: true,
      customDomain: { select: { host: true, status: true } },
      user: { select: { email: true } },
      // Cycle of the open subscription: the e-mails say how often the next charges come
      billingSubscriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1, select: { cycle: true } },
    },
  })
  const email = profile?.user?.email
  if (!profile || !email) return null
  return { slug: profile.slug, host: activeHostOf(profile.customDomain), email, cycle: normalizeCycle(profile.billingSubscriptions?.[0]?.cycle) }
}

/** E-mails to the lawyer on billing transitions. Never throws: failures are logged. */
export async function notifyBilling(n: BillingNotification): Promise<void> {
  try {
    const owner = await loadOwner(n.profileId)
    if (!owner) {
      console.warn("[billing] sem destinatário para notificação", { profileId: n.profileId, notice: n.notice })
      return
    }
    await sendBillingEmail({
      notice: n.notice,
      to: owner.email,
      siteSlug: owner.slug,
      siteHost: owner.host,
      graceUntil: n.entitlement.graceUntil,
      invoiceUrl: n.invoiceUrl,
      cycle: owner.cycle,
    })
  } catch (err) {
    console.error("[billing] falha ao enviar e-mail", { profileId: n.profileId, notice: n.notice }, err)
  }
}

/** Lawyer + team are told about a cancellation request. Never throws: failures are logged. */
export async function notifyCancellationRequested(n: { profileId: string; reason: string; activeUntil: string | null }) {
  try {
    const owner = await loadOwner(n.profileId)
    if (!owner) {
      console.warn("[billing] sem destinatário para cancelamento", { profileId: n.profileId })
      return
    }
    const teamTo = process.env.BILLING_TEAM_EMAIL || DEFAULT_TEAM_EMAIL
    await Promise.all([
      sendCancellationConfirmationEmail({ to: owner.email, activeUntil: n.activeUntil }).catch((e) =>
        console.error("[billing] falha no e-mail de cancelamento ao advogado", e)
      ),
      sendCancellationTeamEmail({
        to: teamTo,
        siteSlug: owner.slug,
        ownerEmail: owner.email,
        reason: n.reason,
        activeUntil: n.activeUntil,
      }).catch((e) => console.error("[billing] falha no e-mail de cancelamento à equipe", e)),
    ])
  } catch (err) {
    console.error("[billing] falha ao notificar cancelamento", { profileId: n.profileId }, err)
  }
}
