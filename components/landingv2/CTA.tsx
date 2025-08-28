import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-100 p-8 md:p-12 shadow-[inset_0_1px_0_rgba(0,0,0,0.03),0_10px_40px_-20px_rgba(0,0,0,0.06)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(transparent 96%, rgba(0,0,0,.08) 96%), linear-gradient(90deg, transparent 96%, rgba(0,0,0,.08) 96%)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-zinc-900">Pronto para testar sem compromisso?</h3>
          <p className="mt-2 max-w-2xl text-zinc-600">Em poucos passos sua landing page jurídica estará no ar. Personalize cores, áreas e conecte seus canais de contato.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-white font-bold hover:from-amber-300 hover:to-amber-500 transition text-xl">
            Testar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}



