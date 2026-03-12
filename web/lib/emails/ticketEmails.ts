import { getResend, EMAIL_FROM } from "@/lib/resend"
import { prisma } from "@/lib/prisma"

function baseTemplate(title: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="border-bottom: 2px solid #000e29; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #000e29;">${title}</h2>
      </div>
      ${body}
      <div style="border-top: 1px solid #e5e5e5; margin-top: 24px; padding-top: 16px; color: #888; font-size: 12px;">
        AdvLink — Plataforma para advogados
      </div>
    </body>
    </html>
  `
}

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

  const html = baseTemplate(
    `Novo Ticket #${ticket.number}`,
    `
      <p>Um novo ticket foi criado:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Ticket:</td><td>#${ticket.number}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Assunto:</td><td>${ticket.subject}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Categoria:</td><td>${categoryLabels[ticket.category] || ticket.category}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Usuário:</td><td>${userName}</td></tr>
      </table>
      <p style="margin-top: 16px;">Acesse o painel admin para visualizar e responder.</p>
    `
  )

  await resend.emails.send({
    from: EMAIL_FROM,
    to: admins.map((a) => a.email),
    subject: `[Ticket #${ticket.number}] ${ticket.subject}`,
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

  const html = baseTemplate(
    `Resposta no Ticket #${ticketNumber}: ${ticketSubject}`,
    `
      <p><strong>${senderName}</strong> respondeu ao ticket <strong>#${ticketNumber}</strong>:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        ${message.replace(/\n/g, "<br>")}
      </div>
      <p style="margin-top: 16px; color: #666; font-size: 13px;">Acesse a plataforma para responder.</p>
    `
  )

  await resend.emails.send({
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: `[Ticket #${ticketNumber}] ${ticketSubject} — Nova resposta`,
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

  const html = baseTemplate(
    `Atualização no Ticket #${ticketNumber}`,
    `
      <p>O status do seu ticket <strong>#${ticketNumber} — ${ticketSubject}</strong> foi atualizado para:</p>
      <p style="font-size: 18px; font-weight: bold; color: #000e29;">${statusLabels[newStatus] || newStatus}</p>
    `
  )

  await resend.emails.send({
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: `[Ticket #${ticketNumber}] ${ticketSubject} — Status atualizado`,
    html,
  })
}
