import { getResend, EMAIL_FROM } from "@/lib/resend"
import { prisma } from "@/lib/prisma"
import { emailTemplate } from "./baseTemplate"

const categoryLabels: Record<string, string> = {
  support: "Suporte",
  billing: "Cobrança",
  bug: "Bug",
  feature_request: "Sugestão",
}

interface TicketEmailData {
  ticketId: string
  number: number
  subject: string
  category: string
}

export async function sendTicketCreatedEmail(
  ticket: TicketEmailData,
  userName: string
) {
  const resend = getResend()
  if (!resend) return

  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { email: true },
  })

  if (admins.length === 0) return

  const html = emailTemplate({
    title: `Novo Ticket #${ticket.number}`,
    preheader: `Novo ticket de ${userName}: ${ticket.subject}`,
    body: `
      <p style="margin:0 0 16px 0;">Um novo ticket foi criado:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
        <tr><td style="padding:8px 0;font-weight:bold;color:#1f2937;">Ticket:</td><td style="padding:8px 0;color:#1f2937;">#${ticket.number}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#1f2937;">Assunto:</td><td style="padding:8px 0;color:#1f2937;">${ticket.subject}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#1f2937;">Categoria:</td><td style="padding:8px 0;color:#1f2937;">${categoryLabels[ticket.category] || ticket.category}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;color:#1f2937;">Usuário:</td><td style="padding:8px 0;color:#1f2937;">${userName}</td></tr>
      </table>
      <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px;">Acesse o painel admin para visualizar e responder.</p>
    `,
  })

  await resend.emails.send({
    from: EMAIL_FROM,
    to: admins.map((a) => a.email),
    subject: `[Ticket #${ticket.number}] ${ticket.subject}`,
    replyTo: "no-reply@advlink.site",
    html,
  })
}

export async function sendTicketReplyEmail(
  ticketNumber: number,
  ticketSubject: string,
  message: string,
  recipientEmail: string,
  senderName: string
) {
  const resend = getResend()
  if (!resend) return

  const html = emailTemplate({
    title: `Resposta no Ticket #${ticketNumber}`,
    preheader: `${senderName} respondeu ao ticket #${ticketNumber}`,
    body: `
      <p style="margin:0 0 16px 0;"><strong>${senderName}</strong> respondeu ao ticket <strong>#${ticketNumber} &mdash; ${ticketSubject}</strong>:</p>
      <div style="background:#f4f5f7;padding:16px;border-radius:6px;margin:0 0 16px 0;font-size:14px;line-height:22px;color:#1f2937;">
        ${message.replace(/\n/g, "<br>")}
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;">Acesse a plataforma para responder.</p>
    `,
  })

  await resend.emails.send({
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: `[Ticket #${ticketNumber}] ${ticketSubject} — Nova resposta`,
    replyTo: "no-reply@advlink.site",
    html,
  })
}

export async function sendTicketStatusChangedEmail(
  ticketNumber: number,
  ticketSubject: string,
  recipientEmail: string,
  newStatus: string
) {
  const resend = getResend()
  if (!resend) return

  const statusLabels: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em andamento",
    waiting_customer: "Aguardando cliente",
    resolved: "Resolvido",
    closed: "Fechado",
  }

  const html = emailTemplate({
    title: `Atualização no Ticket #${ticketNumber}`,
    preheader: `Status do ticket #${ticketNumber} atualizado para ${statusLabels[newStatus] || newStatus}`,
    body: `
      <p style="margin:0 0 16px 0;">O status do seu ticket <strong>#${ticketNumber} &mdash; ${ticketSubject}</strong> foi atualizado para:</p>
      <p style="margin:0;font-size:18px;font-weight:bold;color:#0a2463;">${statusLabels[newStatus] || newStatus}</p>
    `,
  })

  await resend.emails.send({
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: `[Ticket #${ticketNumber}] ${ticketSubject} — Status atualizado`,
    replyTo: "no-reply@advlink.site",
    html,
  })
}
