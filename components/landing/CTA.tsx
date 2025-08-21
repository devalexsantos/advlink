import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-r from-zinc-900 to-black p-8 md:p-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_40px_-20px_rgba(255,255,255,0.08)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(transparent 96%, rgba(255,255,255,.15) 96%), linear-gradient(90deg, transparent 96%, rgba(255,255,255,.15) 96%)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-zinc-50 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">Pronto para testar sem compromisso?</h3>
          <p className="mt-2 max-w-2xl text-zinc-400">Em poucos passos sua landing page jurídica estará no ar. Personalize cores, áreas e conecte seus canais de contato.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400 bg-gradient-to-b from-amber-500 to-amber-700 px-6 py-3 text-white font-bold [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.25)] hover:from-amber-400 hover:to-amber-600 transition text-xl">
            Testar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}


