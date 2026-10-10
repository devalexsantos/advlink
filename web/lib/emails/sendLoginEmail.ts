import { getResend, EMAIL_FROM } from "@/lib/resend"
import { createSignInEmailHtml, createSignInEmailText } from "@/lib/emails/authEmail"

const SUBJECT = "Seu link de acesso à AdvLink"

/** Resend in production (always) or in dev when EMAIL_DEV_TRANSPORT=resend; Mailpit otherwise. */
function useResend() {
  return process.env.NODE_ENV === "production" || process.env.EMAIL_DEV_TRANSPORT === "resend"
}

/**
 * Sends the NextAuth magic link. Throws on failure so NextAuth redirects to the
 * error page. Never logs the URL/token.
 */
export async function sendLoginEmail({ to, url }: { to: string; url: string }): Promise<void> {
  const html = createSignInEmailHtml({ url })
  const text = createSignInEmailText({ url })

  if (useResend()) {
    const resend = getResend()
    if (!resend) {
      console.error("[auth] Magic link not sent: RESEND_API_KEY is not configured")
      throw new Error("Login email could not be sent")
    }
    try {
      const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject: SUBJECT, html, text })
      if (error) throw new Error(error.message || error.name || "unknown Resend error")
    } catch (err) {
      console.error("[auth] Magic link send failed via Resend:", err instanceof Error ? err.message : "unknown error")
      throw new Error("Login email could not be sent")
    }
    return
  }

  // Development only: local Mailpit/MailHog. nodemailer is loaded lazily so production never touches SMTP.
  const nodemailer = (await import("nodemailer")).default
  const transport = nodemailer.createTransport({ host: "127.0.0.1", port: 1025, secure: false, ignoreTLS: true })
  await transport.sendMail({ to, from: EMAIL_FROM, subject: SUBJECT, text, html })
}
