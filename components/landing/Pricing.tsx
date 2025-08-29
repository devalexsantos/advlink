import Link from "next/link"
import { CheckCircle2, Rocket } from "lucide-react"

const pricingBenefits = [
  "Criação com IA das descrições",
  "Layout profissional e responsivo",
  "Edição simples e rápida com IA e sem código",
  "Gatilhos para WhatsApp, E-mail, Telefone e Calendly",
  "Hospedagem inclusa e manutenção",
] as const

export function Pricing() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-20">
      <div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-black p-8 md:p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_40px_-20px_rgba(255,255,255,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-1 text-xs tracking-wide text-zinc-300">Plano único</div>
        <div className="mt-3 flex items-baseline justify-center gap-3">
          <span className="text-xs uppercase tracking-wide text-zinc-300">Preço Original</span>
          <span className="text-orange-400 line-through text-2xl">
            R$ 69,90
          </span>
        </div>
        <h3 className="mt-4 text-6xl font-extrabold">
          <span className="relative inline-block">
            <span className="relative z-10 inline-flex items-start">
              <span>R$ 39</span>
              <span className="ml-1 flex flex-col leading-none items-start">
                <span className="align-top text-2xl">,90</span>
                <span className="text-sm text-zinc-300 leading-none">/ mês</span>
              </span>
            </span>
            <svg aria-hidden viewBox="0 0 240 24" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-1 left-0 h-4 w-full">
              <path d="M2 16 C 75 8, 165 8, 238 16" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        </h3>
        <p className="mt-2 text-amber-400 text-sm font-semibold">Preço de lançamento, irá aumentar em breve</p>
        <p className="mt-2 text-zinc-50 font-bold text-lg">Garanta agora o preço com desconto <strong className="text-amber-400">vitalício</strong></p>
        <div className="mx-auto mt-6 grid max-w-md gap-2 text-left">
          {pricingBenefits.map((i) => (
            <div key={i} className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-lime-400" />
              <span className="text-zinc-300">{i}</span>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-gradient-to-b from-amber-500 to-amber-700 px-6 py-3 text-white font-bold [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.25)] hover:from-amber-400 hover:to-amber-600 transition text-xl">
            Começar agora
            <Rocket className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-zinc-50 font-bold text-sm">
            <span>Teste grátis por</span>
            <span className="text-amber-400">
              <span className="text-xl">{' '}07</span> dias.
            </span>
            <span>{' '}Clique no botão acima.</span>
          </p>
        </div>
      </div>
    </section>
  )
}


