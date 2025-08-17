import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900/40 to-cyan-900/30 p-8 md:p-12">
        <div className="pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-2xl" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <h3 className="text-2xl md:text-3xl font-bold">Pronto para testar sem compromisso?</h3>
          <p className="mt-2 max-w-2xl text-blue-100/80">Em poucos passos sua landing page jurídica estará no ar. Personalize cores, áreas e conecte seus canais de contato.</p>
          <Link href="/onboarding" className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-500 transition">
            Testar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}


