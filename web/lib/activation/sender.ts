import { getResend, EMAIL_FROM } from "@/lib/resend"
import { getAppOrigin, getProfileUrl } from "@/lib/site-url"
import { buildActivationEmail } from "@/lib/emails/activationEmails"
import { buildUnsubscribeUrl, signUnsubscribeToken } from "@/lib/emails/unsubscribe-token"
import type { ActivationSend } from "./drip"

/** Sends one activation e-mail through Resend with List-Unsubscribe headers. Throws on any failure so the drip rolls back. */
export const sendActivationEmail: ActivationSend = async ({ userId, email, name, kind, siteSlug }) => {
  const resend = getResend()
  if (!resend) throw new Error("Resend não configurado")
  const token = await signUnsubscribeToken(userId)
  if (!token) throw new Error("EMAIL_UNSUBSCRIBE_SECRET não configurada (mín. 32 caracteres)")

  const appUrl = getAppOrigin()
  const unsubscribeUrl = buildUnsubscribeUrl(appUrl, token)
  const { subject, html } = buildActivationEmail(kind, {
    name,
    appUrl,
    siteUrl: siteSlug ? getProfileUrl(siteSlug) : null,
    unsubscribeUrl,
  })
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}
