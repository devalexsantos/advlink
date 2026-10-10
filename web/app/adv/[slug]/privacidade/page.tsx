import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { findPublicProfile, publicSiteUrl } from "@/lib/public-profile"
import { formatOab } from "@/lib/oab"
import { getAppOrigin } from "@/lib/site-url"
import { ResetConsentButton } from "./ResetConsentButton"

type RouteParams = Promise<{ slug: string }>

const GTM_ID = /^GTM-[A-Z0-9]{4,10}$/
const ADVLINK_EMAIL = "advlinkcontato@gmail.com"

const card = "rounded-2xl border border-border bg-card p-6"
const h2 = "text-xl font-semibold mb-2"
const body = "text-muted-foreground leading-relaxed"

export default async function PrivacyNoticePage({ params }: { params: RouteParams }) {
  const { slug } = await params
  // Shown even when the site is unpublished: the notice must stay reachable
  const profile = await findPublicProfile({ slug })
  if (!profile) notFound()

  const name = profile.publicName?.trim() || "o(a) advogado(a) responsável por este site"
  const oab = formatOab(profile.oabNumber, profile.oabState)
  const email = profile.publicEmail?.trim() || null
  const a = profile.address
  const addressLine =
    a && a.public !== false
      ? [[a.street, a.number].filter(Boolean).join(", "), a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state]
          .filter(Boolean)
          .join(" — ")
      : ""
  const gtmId = profile.gtmContainerId && GTM_ID.test(profile.gtmContainerId) ? profile.gtmContainerId : null
  const siteUrl = publicSiteUrl(profile, slug)
  const hasForm = profile.leadFormEnabled === true

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <Link
          href={siteUrl}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>
        <h1 className="text-3xl font-extrabold md:text-4xl">Aviso de privacidade</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Site de {name}
          {oab ? ` — ${oab}` : ""}
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 pb-20">
        <section className={card}>
          <h2 className={h2}>Quem é o controlador dos seus dados</h2>
          <p className={body}>
            Para os contatos que você inicia (WhatsApp, e-mail, telefone{hasForm ? ", formulário de contato" : ""}), o
            controlador dos dados é {name}
            {oab ? `, ${oab}` : ""}.
          </p>
          {(email || addressLine) && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              {email && <li>E-mail: {email}</li>}
              {addressLine && <li>Endereço: {addressLine}</li>}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className={h2}>AdvLink como operador</h2>
          <p className={body}>
            Este site é hospedado pelo AdvLink (NAIR APPS, CNPJ 49.957.258/0001-70), que atua como operador: trata os
            dados de acesso em nome do(a) advogado(a), apenas para hospedar o site e gerar as métricas descritas
            abaixo. Se o site oferecer formulário de contato, o AdvLink também recebe e guarda as mensagens enviadas por
            ele, sempre em nome do(a) advogado(a) e seguindo as instruções dele(a).
          </p>
        </section>

        <section className={card}>
          <h2 className={h2}>Quais dados são tratados</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Métricas de visita, sem cookies: página acessada, origem da visita, tipo de dispositivo, cidade
              aproximada e um identificador diário pseudonimizado. O seu endereço IP não é guardado.
            </li>
            <li>
              Contagem de cliques nos botões de contato (WhatsApp, e-mail, telefone), sem registrar o número ou o
              endereço de destino.
            </li>
            <li>
              Dados que você envia ao entrar em contato por WhatsApp, e-mail ou telefone (mensagem, nome, telefone).
              Eles ficam com o(a) advogado(a), nos aplicativos que ele(a) usa para atender você, e não passam pelo
              AdvLink.
            </li>
            {hasForm && (
              <li>
                Dados que você envia pelo formulário de contato: nome, e-mail e/ou telefone, assunto e mensagem. Eles são
                recebidos e guardados pelo AdvLink, como operador, em nome do(a) advogado(a), que é o(a) único(a) a ter
                acesso a eles, no painel do site e por e-mail. Não envie pelo formulário dados sensíveis (como dados de
                saúde) nem documentos: descreva o assunto de forma geral.
              </li>
            )}
            {gtmId && (
              <li>
                Se você aceitar, o Google Tag Manager (Google) é carregado e pode coletar dados de navegação conforme
                configurado pelo(a) advogado(a).
              </li>
            )}
          </ul>
        </section>

        <section className={card}>
          <h2 className={h2}>Base legal</h2>
          <p className={body}>
            As métricas agregadas e sem cookies se apoiam no legítimo interesse (LGPD, art. 7º, IX) de entender como o
            site é usado e de mantê-lo seguro. Tags de terceiros, como o Google Tag Manager, só são carregadas com o seu
            consentimento (art. 7º, I), que você pode recusar ou revogar a qualquer momento.
            {hasForm &&
              " As mensagens do formulário de contato são tratadas com base no seu consentimento (art. 7º, I), dado ao marcar a caixa de concordância antes do envio."}
          </p>
        </section>

        <section className={card}>
          <h2 className={h2}>Por quanto tempo guardamos</h2>
          <p className={body}>
            As métricas ficam guardadas enquanto o site existir no AdvLink e são excluídas junto com ele. O identificador
            diário muda a cada dia e não permite acompanhar você por longos períodos. Mensagens enviadas pelo formulário
            de contato, quando o site oferecer um, ficam guardadas no AdvLink por 90 dias e depois são excluídas
            automaticamente. Mensagens enviadas diretamente ao(à) advogado(a) seguem a retenção dele(a).
          </p>
        </section>

        <section className={card}>
          <h2 className={h2}>Seus direitos</h2>
          <p className={body}>
            Nos termos do art. 18 da LGPD, você pode pedir confirmação do tratamento, acesso, correção, anonimização,
            eliminação, informação sobre compartilhamento e a revogação do consentimento. Fale com {name}
            {email ? ` pelo e-mail ${email}` : " pelos contatos divulgados neste site"}, ou com o AdvLink pelo e-mail{" "}
            {ADVLINK_EMAIL}.
          </p>
        </section>

        {gtmId && (
          <section className={card}>
            <h2 className={h2}>Como mudar a escolha de cookies</h2>
            <p className={body}>
              Ao clicar no botão abaixo, sua escolha anterior é apagada e o aviso de cookies aparece de novo na próxima
              página.
            </p>
            <ResetConsentButton gtmContainerId={gtmId} />
          </section>
        )}

        <p className="text-sm text-muted-foreground">
          Veja também os{" "}
          <a href={`${getAppOrigin()}/termos-e-privacidade`} className="underline underline-offset-4">
            Termos de Uso e a Política de Privacidade do AdvLink
          </a>
          .
        </p>
      </main>
    </div>
  )
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { slug } = await params
  const profile = await prisma.profile.findFirst({ where: { slug }, select: { publicName: true } })
  return {
    title: `Aviso de privacidade — ${profile?.publicName?.trim() || "Advogado"}`,
    robots: { index: false, follow: false },
  }
}
