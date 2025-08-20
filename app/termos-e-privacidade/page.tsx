import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPrivacyPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-zinc-100">
      <header className="relative mx-auto max-w-6xl px-6 pt-20 pb-10">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-transparent px-4 py-2 text-zinc-200 hover:bg-zinc-900/70 transition">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-zinc-50 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Última atualização: {new Date().getFullYear()}.</p>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Quem somos</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              O AdvLink é uma plataforma que ajuda profissionais do direito a criarem uma landing page moderna e
              personalizável, com recursos como editor assistido por IA, áreas de atuação, galeria, links, integração
              com WhatsApp, e suporte a agendamentos via Calendly.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Aceite dos termos</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              Ao criar uma conta, acessar ou utilizar o AdvLink, você concorda com estes Termos de Uso e com a nossa
              Política de Privacidade. Se você não concordar com qualquer parte, não utilize a plataforma.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Conta, assinatura e pagamentos</h2>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300/90">
              <li>Alguns recursos são pagos e exigem uma assinatura ativa.</li>
              <li>O pagamento é processado de forma segura por parceiro externo (Stripe).</li>
              <li>Você pode cancelar a qualquer momento; o acesso permanece até o fim do período vigente.</li>
              <li>Podemos alterar preços e planos, comunicando previamente quando aplicável.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Conteúdo do usuário</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              Você é o responsável pelo conteúdo inserido (textos, imagens, links e informações). Não é permitido
              publicar conteúdo ilegal, ofensivo, enganoso, difamatório, que viole direitos autorais, marcas ou a
              legislação aplicável. Podemos remover conteúdos que violem estes termos.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Direitos autorais e propriedade</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              O AdvLink, seu layout, componentes visuais e código são protegidos por direitos autorais. O uso da marca
              e identidade visual exige autorização. O conteúdo que você cria permanece seu; você nos concede permissão
              para processá-lo e exibi-lo para operar o serviço.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Disponibilidade e alterações do serviço</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              Trabalhamos para manter a plataforma estável e segura, porém não garantimos disponibilidade contínua. As
              funcionalidades podem mudar, ser adicionadas ou descontinuadas a qualquer tempo, visando melhorias do
              serviço.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Limitação de responsabilidade</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              O AdvLink não se responsabiliza por prejuízos indiretos, incidentais, consequenciais ou perda de dados
              decorrentes do uso da plataforma. O uso é oferecido “como está”. Em qualquer hipótese, nossa
              responsabilidade total será limitada ao valor pago nos últimos 12 meses.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Política de Privacidade</h2>
            <div className="space-y-3 text-zinc-300/90">
              <p>
                Esta Política descreve como coletamos, usamos e protegemos seus dados pessoais ao utilizar o AdvLink.
              </p>
              <h3 className="font-semibold">Dados que coletamos</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dados de conta (nome, e-mail, autenticação via provedores).</li>
                <li>Dados de perfil exibidos publicamente (nome, áreas de atuação, descrições, links, galeria etc.).</li>
                <li>Preferências visuais (tema, cores, imagens de capa/avatares).</li>
                <li>Dados de pagamento e status de assinatura (via Stripe).</li>
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

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-2">Contato</h2>
            <p className="text-zinc-300/90 leading-relaxed">
              Em caso de dúvidas sobre estes termos ou sobre a Política de Privacidade, entre em contato:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300/90">
              <li>E-mail: advlinkcontato@gmail.com</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}


