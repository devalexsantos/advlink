import { emailTemplate } from "./baseTemplate"
import { escapeHtml } from "./billingEmails"

export const LEAD_EMAIL_SUBJECT = "Nova mensagem pelo seu site"

export interface LeadEmailContext {
  siteName: string
  name: string
  email?: string | null
  phone?: string | null
  areaTitle?: string | null
  message: string
  /** Absolute URL of the dashboard inbox (e.g. https://app.advlink.site/profile/contatos). */
  inboxUrl: string
  retentionDays: number
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;color:#1f2937;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:#1f2937;word-break:break-word;">${value}</td></tr>`

/**
 * E-mail sent to the site owner when a visitor submits the contact form. Every visitor-supplied
 * value is HTML-escaped: the form is public, so its content is attacker-controlled.
 */
export function buildLeadEmail(ctx: LeadEmailContext): { subject: string; html: string } {
  const name = escapeHtml(ctx.name)
  const site = escapeHtml(ctx.siteName)
  const rows = [row("Nome:", name)]
  if (ctx.email) {
    const email = escapeHtml(ctx.email)
    rows.push(row("E-mail:", `<a href="mailto:${email}" style="color:#0a2463;">${email}</a>`))
  }
  if (ctx.phone) rows.push(row("Telefone:", escapeHtml(ctx.phone)))
  if (ctx.areaTitle) rows.push(row("Assunto:", escapeHtml(ctx.areaTitle)))

  const message = escapeHtml(ctx.message).replace(/\r?\n/g, "<br>")

  const body = `
      <p style="margin:0 0 16px 0;">Você recebeu uma nova mensagem pelo formulário de contato do site <strong>${site}</strong>.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:0 0 16px 0;">
        ${rows.join("\n        ")}
      </table>
      <div style="background:#f4f5f7;padding:16px;border-radius:6px;margin:0;font-size:14px;line-height:22px;color:#1f2937;word-break:break-word;">
        ${message}
      </div>
    `

  const footerNote =
    `${ctx.email ? "Responder a este e-mail envia a resposta diretamente para o visitante. " : ""}` +
    `Por segurança, as mensagens ficam disponíveis no painel por ${ctx.retentionDays} dias e depois são excluídas automaticamente. ` +
    "Use estes dados apenas para responder ao contato."

  const html = emailTemplate({
    title: LEAD_EMAIL_SUBJECT,
    preheader: escapeHtml(`Mensagem de ${ctx.name} pelo site ${ctx.siteName}`),
    body,
    cta: { label: "Ver mensagens", url: escapeHtml(ctx.inboxUrl) },
    footerNote: escapeHtml(footerNote),
  })

  return { subject: LEAD_EMAIL_SUBJECT, html }
}
