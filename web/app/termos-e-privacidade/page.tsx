import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { REFUND_WINDOW_DAYS } from "@/lib/billing/plan"

export default function TermsPrivacyPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <header className="relative mx-auto max-w-6xl px-6 pt-20 pb-10">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-foreground hover:bg-muted transition">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: {new Date().getFullYear()}.</p>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Quem somos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AdvLink é uma plataforma que ajuda profissionais do direito a criarem uma landing page moderna e
              personalizável, com recursos como editor assistido por IA, áreas de atuação, galeria, links, integração
              com WhatsApp, e suporte a agendamentos via Calendly. O AdvLink é operado pela NAIR APPS, inscrita no CNPJ 49.957.258/0001-70.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Aceite dos termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta, acessar ou utilizar o AdvLink, você concorda com estes Termos de Uso e com a nossa
              Política de Privacidade. Se você não concordar com qualquer parte, não utilize a plataforma.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Conta, assinatura e pagamentos</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Alguns recursos são pagos e exigem uma assinatura ativa.</li>
              <li>O pagamento (cartão, boleto ou Pix) é processado de forma segura pelo Asaas, parceiro externo de pagamentos; a cobrança é emitida em nome da NAIR APPS.</li>
              <li>Você pode cancelar a qualquer momento; o site permanece publicado até o fim do período já pago.</li>
              <li>Você pode desistir da contratação em até {REFUND_WINDOW_DAYS} dias após o primeiro pagamento, com reembolso integral, solicitando pelo suporte.</li>
              <li>Em caso de atraso, o site fica no ar por mais 5 dias; depois sai do ar até o pagamento, e a assinatura é encerrada após 30 dias.</li>
              <li>Podemos alterar preços e planos, comunicando previamente quando aplicável.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Conteúdo do usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você é o responsável pelo conteúdo inserido (textos, imagens, links e informações). Não é permitido
              publicar conteúdo ilegal, ofensivo, enganoso, difamatório, que viole direitos autorais, marcas ou a
              legislação aplicável. Podemos remover conteúdos que violem estes termos.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Direitos autorais e propriedade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AdvLink, seu layout, componentes visuais e código são protegidos por direitos autorais. O uso da marca
              e identidade visual exige autorização. O conteúdo que você cria permanece seu; você nos concede permissão
              para processá-lo e exibi-lo para operar o serviço.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Disponibilidade e alterações do serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              Trabalhamos para manter a plataforma estável e segura, porém não garantimos disponibilidade contínua. As
              funcionalidades podem mudar, ser adicionadas ou descontinuadas a qualquer tempo, visando melhorias do
              serviço.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Limitação de responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AdvLink não se responsabiliza por prejuízos indiretos, incidentais, consequenciais ou perda de dados
              decorrentes do uso da plataforma. O uso é oferecido “como está”. Em qualquer hipótese, nossa
              responsabilidade total será limitada ao valor pago nos últimos 12 meses.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Política de Privacidade</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Esta Política descreve como coletamos, usamos e protegemos seus dados pessoais ao utilizar o AdvLink.
              </p>
              <h3 className="font-semibold">Dados que coletamos</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dados de conta (nome, e-mail, autenticação via provedores).</li>
                <li>Dados de perfil exibidos publicamente (nome, áreas de atuação, descrições, links, galeria etc.).</li>
                <li>Preferências visuais (tema, cores, imagens de capa/avatares).</li>
                <li>Status de assinatura e de cobranças (via Asaas); dados de cartão não são armazenados pelo AdvLink.</li>
                <li>Métricas de uso e analytics (cookies e tecnologias semelhantes).</li>
              </ul>
              <h3 className="font-semibold">Como usamos os dados</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Para prover e melhorar a plataforma e suas funcionalidades.</li>
                <li>Para comunicação e suporte relacionados à sua conta.</li>
                <li>Para processar pagamentos/assinaturas e prevenir fraudes.</li>
              </ul>
              <h3 className="font-semibold">Compartilhamento</h3>
              <p>
                Compartilhamos dados apenas com provedores essenciais (ex.: hospedagem, pagamentos, analytics) e quando
                exigido por lei.
              </p>
              <h3 className="font-semibold">Retenção e exclusão</h3>
              <p>Guardamos dados pelo tempo necessário. Você pode solicitar exclusão ou correção via suporte.</p>
              <h3 className="font-semibold">Segurança</h3>
              <p>Adotamos medidas técnicas e organizacionais para proteger suas informações.</p>
              <h3 className="font-semibold">Seus direitos</h3>
              <p>
                Você pode acessar, corrigir ou solicitar a exclusão de seus dados a qualquer momento. Entre em contato
                pelo e-mail indicado abaixo.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Visitantes dos sites dos assinantes (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em relação aos visitantes dos sites publicados pelos assinantes, o assinante é o controlador dos dados e o
              AdvLink atua como operador (LGPD, art. 39), tratando-os apenas para hospedar o site e gerar métricas de
              visita sem cookies. Cada site tem um aviso de privacidade próprio, acessível pelo link “Privacidade” no
              rodapé. Quando o assinante configura o Google Tag Manager, o AdvLink exibe um banner de consentimento e só
              carrega o script depois que o visitante aceita.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em caso de dúvidas sobre estes termos ou sobre a Política de Privacidade, entre em contato:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>E-mail: advlinkcontato@gmail.com</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}


