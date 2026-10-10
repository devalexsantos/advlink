import { getResend, EMAIL_FROM } from "@/lib/resend"
import { emailTemplate } from "./baseTemplate"
import { getAppOrigin, getSiteUrl } from "@/lib/site-url"

export type BillingEmailNotice = "activated" | "reactivated" | "overdue" | "suspended" | "canceled"

export interface BillingEmailInput {
  notice: BillingEmailNotice
  to: string
  siteSlug: string | null
  /** Active custom domain of the site, used as its URL when present. */
  siteHost?: string | null
  graceUntil: string | null
  invoiceUrl: string | null
  /** Cycle of the subscription (MONTHLY when missing): wording of the renewal sentence. */
  cycle?: "MONTHLY" | "YEARLY"
}

export function escapeHtml(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** YYYY-MM-DD (or ISO timestamp) -> dd/mm/aaaa. Returns "" when unparseable. */
export function formatBrDate(d: string | null | undefined): string {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ""
}

/** Only http(s) URLs are allowed in links; characters that could break the href attribute are encoded. */
function safeUrl(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null
  return url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E")
}

const p = (text: string) => `<p style="margin:0 0 16px 0;">${text}</p>`
const small = (text: string) => `<p style="margin:0;color:#6b7280;font-size:13px;">${text}</p>`

export function buildBillingEmail(input: BillingEmailInput): { subject: string; html: string } {
  const { notice, siteSlug, graceUntil, invoiceUrl } = input
  const siteUrl = siteSlug ? getSiteUrl({ slug: siteSlug, customDomainHost: input.siteHost }) : `${getAppOrigin()}/profile/account`
  const siteLink = `<a href="${escapeHtml(siteUrl)}" style="color:#0a2463;">${escapeHtml(siteUrl)}</a>`
  const accountUrl = `${getAppOrigin()}/profile/account`
  const payUrl = safeUrl(invoiceUrl)
  const payCta = { label: "Pagar fatura", url: payUrl ?? accountUrl }
  const accountCta = { label: "Minha conta", url: accountUrl }
  const grace = formatBrDate(graceUntil)
  const period = input.cycle === "YEARLY" ? "a cada ano" : "a cada mês"

  let subject: string
  let title: string
  let preheader: string
  let body: string
  let cta: { label: string; url: string }

  switch (notice) {
    case "activated":
      subject = "Pagamento confirmado: seu site está publicado"
      title = "Pagamento confirmado"
      preheader = "Seu site AdvLink já está publicado."
      body =
        p("Recebemos a confirmação do seu pagamento e o seu site está publicado:") +
        p(`<strong>${siteLink}</strong>`) +
        p(`As próximas cobranças serão geradas automaticamente ${period}. Você pode acompanhar a assinatura e as faturas em Minha conta.`)
      cta = { label: "Ver meu site", url: siteUrl }
      break
    case "reactivated":
      subject = "Seu site voltou ao ar"
      title = "Seu site voltou ao ar"
      preheader = "Pagamento identificado: seu site está novamente publicado."
      body =
        p("Identificamos o pagamento da sua assinatura e o seu site está novamente publicado:") +
        p(`<strong>${siteLink}</strong>`) +
        p(`As próximas cobranças continuam sendo geradas automaticamente ${period}.`)
      cta = { label: "Ver meu site", url: siteUrl }
      break
    case "overdue":
      subject = "Pagamento em atraso na sua assinatura AdvLink"
      title = "Pagamento em atraso"
      preheader = "Há uma fatura em aberto na sua assinatura."
      body =
        p("Não identificamos o pagamento da fatura mais recente da sua assinatura.") +
        p(
          grace
            ? `Seu site continua no ar até <strong>${grace}</strong>. Regularizando o pagamento até essa data, nada muda para você.`
            : "Seu site continua no ar por um período de tolerância. Regularizando o pagamento, nada muda para você."
        ) +
        small(
          payUrl
            ? "Se você já pagou, desconsidere esta mensagem: a baixa pode levar alguns instantes."
            : "Acesse Minha conta para ver a fatura em aberto."
        )
      cta = payCta
      break
    case "suspended":
      subject = "Seu site está fora do ar por falta de pagamento"
      title = "Site fora do ar"
      preheader = "O pagamento em aberto suspendeu a publicação do seu site."
      body =
        p("Como a fatura continua em aberto, o seu site foi retirado do ar.") +
        p("Ao pagar a fatura, o site volta a ser publicado automaticamente, sem nenhuma outra ação sua.") +
        small("Se o pagamento não for regularizado em até 30 dias, a assinatura será cancelada.")
      cta = payCta
      break
    case "canceled":
      subject = "Sua assinatura AdvLink foi encerrada"
      title = "Assinatura encerrada"
      preheader = "Sua assinatura foi encerrada e o site está fora do ar."
      body =
        p("Sua assinatura foi encerrada e o seu site está fora do ar.") +
        p("Se quiser voltar, você pode reativar a assinatura a qualquer momento em Minha conta. Suas informações continuam salvas.")
      cta = accountCta
      break
  }

  return { subject, html: emailTemplate({ title, preheader, body, cta }) }
}

export async function sendBillingEmail(input: BillingEmailInput): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const { subject, html } = buildBillingEmail(input)
  await resend.emails.send({ from: EMAIL_FROM, to: input.to, subject, html })
}

export interface CancellationEmailInput {
  to: string
  activeUntil: string | null
}

export async function sendCancellationConfirmationEmail(input: CancellationEmailInput): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const until = formatBrDate(input.activeUntil)
  const status = until
    ? `Seu site fica no ar até <strong>${until}</strong>, período já pago. Depois dessa data, ele sai do ar e não haverá novas cobranças.`
    : "Seu site já está fora do ar e não haverá novas cobranças."
  const html = emailTemplate({
    title: "Cancelamento solicitado",
    preheader: until ? `Seu site fica no ar até ${until}.` : "Recebemos o seu pedido de cancelamento.",
    body:
      p("Recebemos o seu pedido de cancelamento da assinatura.") +
      p(status) +
      small("Você pode reativar a assinatura a qualquer momento em Minha conta."),
    cta: { label: "Minha conta", url: `${getAppOrigin()}/profile/account` },
  })
  await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: "Confirmação do cancelamento da sua assinatura",
    html,
  })
}

export interface CancellationTeamEmailInput {
  to: string
  siteSlug: string | null
  ownerEmail: string
  reason: string
  activeUntil: string | null
}

export async function sendCancellationTeamEmail(input: CancellationTeamEmailInput): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const until = formatBrDate(input.activeUntil)
  const row = (k: string, v: string) => `<p style="margin:0 0 8px 0;"><strong>${k}:</strong> ${v}</p>`
  const html = emailTemplate({
    title: "Cancelamento de assinatura",
    preheader: `Cancelamento solicitado: ${escapeHtml(input.siteSlug ?? "(sem slug)")}`,
    body:
      row("Site", escapeHtml(input.siteSlug ?? "(sem slug)")) +
      row("Usuário (e-mail)", escapeHtml(input.ownerEmail)) +
      row("No ar até", until || "já fora do ar") +
      `<p style="margin:0 0 4px 0;"><strong>Motivo:</strong></p><p style="margin:0;white-space:pre-wrap;">${
        input.reason ? escapeHtml(input.reason) : "(não informado)"
      }</p>`,
  })
  await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: `Cancelamento de assinatura: ${input.siteSlug ?? "(sem slug)"}`,
    html,
  })
}
