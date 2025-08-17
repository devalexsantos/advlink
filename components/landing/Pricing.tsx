import Link from "next/link"
import { CheckCircle2, Rocket } from "lucide-react"

const pricingBenefits = [
  "Criação com IA das descrições",
  "Layout profissional e responsivo",
  "Edição simples e rápida",
  "Integração com WhatsApp e e-mail",
  "Hospedagem inclusa",
] as const

export function Pricing() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-20">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-900/40 to-blue-900/10 p-8 md:p-10 text-center shadow-[0_0_40px_-20px_rgba(59,130,246,0.6)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs tracking-wide text-blue-200">Plano único</div>
        <h3 className="mt-4 text-4xl font-extrabold">R$ 39,00</h3>
        <p className="mt-2 text-blue-100/80">Tudo o que você precisa para ter uma página profissional</p>
        <div className="mx-auto mt-6 grid max-w-md gap-2 text-left">
          {pricingBenefits.map((i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-blue-100/90">{i}</span>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-500 transition">
            Começar agora
            <Rocket className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}


