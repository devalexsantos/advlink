import { getResend, EMAIL_FROM } from "@/lib/resend"
import { getAppOrigin, getSiteUrl } from "@/lib/site-url"
import { getActiveCustomDomainHost } from "@/lib/custom-domain"
import { buildActivationEmail } from "@/lib/emails/activationEmails"
import { buildMonthlyReportEmail } from "@/lib/emails/monthlyReport"
import { buildUnsubscribeUrl, signUnsubscribeToken } from "@/lib/emails/unsubscribe-token"
import type { ActivationSend } from "./drip"
import type { MonthlyReportSend } from "./monthly-report"

/**
 * Sends one marketing/lifecycle e-mail through Resend with List-Unsubscribe headers.
 * `build` receives the unsubscribe URL and the app origin. Throws on any failure so callers roll back.
 */
export async function sendMarketingEmail(
  { userId, to }: { userId: string; to: string },
  build: (ctx: { appUrl: string; unsubscribeUrl: string }) => { subject: string; html: string },
): Promise<void> {
  const resend = getResend()
  if (!resend) throw new Error("Resend não configurado")
  const token = await signUnsubscribeToken(userId)
  if (!token) throw new Error("EMAIL_UNSUBSCRIBE_SECRET não configurada (mín. 32 caracteres)")

  const appUrl = getAppOrigin()
  const unsubscribeUrl = buildUnsubscribeUrl(appUrl, token)
  const { subject, html } = build({ appUrl, unsubscribeUrl })
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

/** Sends one activation e-mail. Throws on any failure so the drip rolls back. */
export const sendActivationEmail: ActivationSend = async ({ userId, email, name, kind, siteId, siteSlug }) => {
  const customDomainHost = siteId && siteSlug ? await getActiveCustomDomainHost(siteId) : null
  return sendMarketingEmail({ userId, to: email }, ({ appUrl, unsubscribeUrl }) =>
    buildActivationEmail(kind, {
      name,
      appUrl,
      siteUrl: siteSlug ? getSiteUrl({ slug: siteSlug, customDomainHost }) : null,
      unsubscribeUrl,
    }),
  )
}

/** Sends one monthly report. Throws on any failure so the runner rolls back. */
export const sendMonthlyReportEmail: MonthlyReportSend = (r) =>
  sendMarketingEmail({ userId: r.userId, to: r.email }, ({ appUrl, unsubscribeUrl }) =>
    buildMonthlyReportEmail({
      name: r.name,
      siteName: r.siteName,
      siteUrl: getSiteUrl({ slug: r.siteSlug, customDomainHost: r.siteHost }),
      monthName: r.monthName,
      previousMonthName: r.previousMonthName,
      summary: r.summary,
      previousVisits: r.previousVisits,
      analyticsUrl: `${appUrl}/profile/analytics`,
      shareKitUrl: `${appUrl}/profile/divulgar`,
      unsubscribeUrl,
    }),
  )
