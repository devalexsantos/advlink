import { emailTemplate } from "./baseTemplate"
import { escapeHtml } from "./billingEmails"
import type { SiteSummary } from "@/lib/analytics/summary"
import type { ContactKind } from "@/lib/contact-clicks"

export interface MonthlyReportContext {
  name: string | null
  siteName: string
  siteUrl: string
  /** Month of the report, e.g. "setembro" */
  monthName: string
  /** Previous month's name, e.g. "agosto" (used for the comparison phrase) */
  previousMonthName?: string
  summary: SiteSummary
  previousVisits: number
  analyticsUrl: string
  shareKitUrl: string
  unsubscribeUrl: string
}

const CHANNEL_LABEL: Record<ContactKind, string> = {
  whatsapp: "WhatsApp",
  phone: "telefone",
  email: "e-mail",
  link: "links",
  form: "formulário",
}
const CHANNEL_ORDER: ContactKind[] = ["whatsapp", "phone", "email", "form", "link"]

const p = (text: string) => `<p style="margin:0 0 16px 0;">${text}</p>`
const li = (text: string) => `<li style="margin:0 0 6px 0;">${text}</li>`
const ul = (items: string[]) => `<ul style="margin:0 0 16px 0;padding:0 0 0 20px;">${items.map(li).join("")}</ul>`
const h = (text: string) => `<p style="margin:0 0 8px 0;font-weight:600;color:#111827;">${text}</p>`
const num = (n: number) => n.toLocaleString("pt-BR")
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`

/** Neutral month-over-month phrase; null when there is no baseline. */
export function compareVisits(visits: number, previousVisits: number, previousMonthName: string): string | null {
  if (previousVisits <= 0) return null
  const prev = escapeHtml(previousMonthName)
  const pct = Math.round(((visits - previousVisits) / previousVisits) * 100)
  if (pct === 0) return `Mesma quantidade de ${prev}.`
  return pct > 0 ? `${pct}% a mais que em ${prev}.` : `${Math.abs(pct)}% a menos que em ${prev}.`
}

export function buildMonthlyReportEmail(ctx: MonthlyReportContext): { subject: string; html: string } {
  const { summary } = ctx
  const month = escapeHtml(ctx.monthName)
  const first = escapeHtml((ctx.name ?? "").trim().split(/\s+/)[0])
  const hello = first ? `Olá, ${first}!` : "Olá!"
  const site = escapeHtml(ctx.siteName)
  const siteUrl = escapeHtml(ctx.siteUrl)

  const subject = `Seu site em ${ctx.monthName}: ${plural(summary.visits, "visita", "visitas")}`

  const parts: string[] = [
    p(hello),
    p(`Este é o resumo de <strong>${site}</strong> (<a href="${siteUrl}" style="color:#0a2463;">${siteUrl}</a>) em ${month}.`),
  ]

  const comparison = ctx.previousMonthName ? compareVisits(summary.visits, ctx.previousVisits, ctx.previousMonthName) : null
  parts.push(
    p(
      `<span style="font-size:28px;font-weight:700;color:#0a2463;">${num(summary.visits)}</span> ${summary.visits === 1 ? "visita" : "visitas"}` +
        (summary.visitors > 0 ? `, de ${plural(summary.visitors, "visitante", "visitantes")} (contagem diária)` : "") +
        "." +
        (comparison ? `<br />${comparison}` : ""),
    ),
  )

  const channels = CHANNEL_ORDER.filter((k) => summary.contactClicks.byKind[k] > 0)
  if (channels.length > 0) {
    parts.push(h("Cliques em contato"))
    parts.push(ul(channels.map((k) => `${CHANNEL_LABEL[k]}: ${num(summary.contactClicks.byKind[k])}`)))
  }

  if (summary.topCities.length > 0) {
    parts.push(h("Cidades com mais visitas"))
    parts.push(
      ul(
        summary.topCities.map(
          (c) => `${escapeHtml(c.region ? `${c.city}/${c.region}` : c.city)}: ${num(c.count)}`,
        ),
      ),
    )
  }

  if (summary.topSources.length > 0) {
    parts.push(h("De onde vieram as visitas"))
    parts.push(ul(summary.topSources.map((s) => `${escapeHtml(s.source)}: ${num(s.count)}`)))
  }

  parts.push(
    p(
      `Uma ideia: incluir o endereço do site na bio das redes sociais e na assinatura de e-mail. O <a href="${escapeHtml(ctx.shareKitUrl)}" style="color:#0a2463;">kit de divulgação</a> tem QR code e textos prontos.`,
    ),
  )

  const html = emailTemplate({
    title: `Seu site em ${month}`,
    body: parts.join(""),
    cta: { label: "Ver relatório completo", url: ctx.analyticsUrl },
    preheader: `${plural(summary.visits, "visita", "visitas")} em ${month}.`,
    unsubscribeUrl: ctx.unsubscribeUrl,
  })
  return { subject, html }
}
