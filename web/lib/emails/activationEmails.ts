import { emailTemplate } from "./baseTemplate"
import { escapeHtml } from "./billingEmails"
import { REFUND_WINDOW_DAYS } from "@/lib/billing/plan"

export type ActivationEmailKind = "welcome" | "checklist" | "oab_tips" | "last_reminder" | "share_kit"

export interface ActivationEmailContext {
  name: string | null
  /** Origin of the app, e.g. https://app.advlink.site */
  appUrl: string
  siteUrl?: string | null
  unsubscribeUrl: string
}

const p = (text: string) => `<p style="margin:0 0 16px 0;">${text}</p>`
const li = (text: string) => `<li style="margin:0 0 8px 0;">${text}</li>`
const ul = (items: string[]) => `<ul style="margin:0 0 16px 0;padding:0 0 0 20px;">${items.map(li).join("")}</ul>`

export function buildActivationEmail(
  kind: ActivationEmailKind,
  ctx: ActivationEmailContext,
): { subject: string; html: string } {
  const first = escapeHtml((ctx.name ?? "").trim().split(/\s+/)[0])
  const hello = first ? `Olá, ${first}!` : "Olá!"
  const editorUrl = `${ctx.appUrl}/profile/edit`
  const shareUrl = `${ctx.appUrl}/profile/divulgar`

  let subject: string
  let title: string
  let preheader: string
  let body: string
  let cta: { label: string; url: string }

  switch (kind) {
    case "welcome":
      subject = "Bem-vindo ao AdvLink: seus próximos passos"
      title = "Bem-vindo ao AdvLink"
      preheader = "Veja em poucos passos como deixar seu site pronto."
      body =
        p(hello) +
        p("Sua conta está criada. Para deixar seu site pronto, estes são os próximos passos:") +
        ul([
          "complete seu perfil com foto, número da OAB e contatos;",
          "descreva suas áreas de atuação;",
          "acompanhe o checklist no editor, que mostra o que ainda falta;",
          "use o botão <strong>Compartilhar prévia</strong> para mostrar o site a um colega ou cliente antes de publicar.",
        ])
      cta = { label: "Abrir o editor", url: editorUrl }
      break
    case "checklist":
      subject = "O que falta para o seu site ficar pronto"
      title = "Falta pouco para o seu site"
      preheader = "Foto, OAB, áreas de atuação e contato costumam ser os últimos itens."
      body =
        p(hello) +
        p("Seu site ainda não foi publicado. Costumam faltar estes itens:") +
        ul([
          "foto profissional;",
          "número da OAB e seccional;",
          "áreas de atuação com uma breve descrição;",
          "ao menos um canal de contato, como WhatsApp ou e-mail.",
        ]) +
        p("O checklist do editor mostra o que já está pronto.")
      cta = { label: "Continuar no editor", url: editorUrl }
      break
    case "oab_tips":
      subject = "3 cuidados de publicidade da OAB que seu site já respeita"
      title = "3 cuidados de publicidade da OAB"
      preheader = "O Provimento 205/2021 em linguagem simples."
      body =
        p(hello) +
        p(
          "A publicidade da advocacia segue regras de sobriedade e informação. O AdvLink foi pensado para seguir o Provimento 205/2021 do Conselho Federal da OAB. Três cuidados que você encontra no seu site:",
        ) +
        ul([
          "<strong>Sem título que você não tem.</strong> Não use &ldquo;especialista&rdquo; sem o título correspondente. Prefira descrever suas áreas de atuação.",
          "<strong>Sem promessa de resultado.</strong> Informe o que você faz, sem garantir êxito ou comparar com outros profissionais.",
          "<strong>OAB visível.</strong> Seu nome e número de inscrição aparecem de forma clara no perfil.",
        ]) +
        p("Revise o conteúdo do seu site com essas regras em mente antes de publicar.")
      cta = { label: "Revisar meu site", url: editorUrl }
      break
    case "last_reminder":
      subject = "Seu site AdvLink está esperando a publicação"
      title = "Seu site está quase pronto"
      preheader = `Publicação com garantia de ${REFUND_WINDOW_DAYS} dias.`
      body =
        p(hello) +
        p(
          "Você começou a montar seu site e ele ainda não está no ar. No editor, o botão <strong>Compartilhar prévia</strong> permite mostrar o resultado a quem você quiser antes de publicar.",
        ) +
        p(
          `Ao assinar, você tem ${REFUND_WINDOW_DAYS} dias de garantia: se não gostar, pode pedir o cancelamento com reembolso dentro desse prazo.`,
        )
      cta = { label: "Ver meu site", url: editorUrl }
      break
    case "share_kit": {
      subject = "Seu site está no ar: divulgue-o"
      title = "Seu site está no ar"
      preheader = "QR code, cartão de contato e textos prontos para divulgar."
      const site = ctx.siteUrl ? escapeHtml(ctx.siteUrl) : null
      body =
        p(hello) +
        p("Parabéns pela publicação!" + (site ? ` Seu endereço é <a href="${site}" style="color:#0a2463;">${site}</a>.` : "")) +
        p("Para que mais pessoas conheçam o site, preparamos um kit de divulgação com:") +
        ul(["QR code para cartões e materiais impressos;", "cartão de contato (vCard) para salvar na agenda;", "textos prontos para compartilhar."])
      cta = { label: "Abrir o kit de divulgação", url: shareUrl }
      break
    }
  }

  const html = emailTemplate({ title, body, cta, preheader, unsubscribeUrl: ctx.unsubscribeUrl })
  return { subject, html }
}
