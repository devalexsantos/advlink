import { Scale, ShieldCheck, Zap } from "lucide-react"

export function Highlights() {
  return (
    <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 -mt-8 text-center">
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 w-full">
        <div className="flex flex-col justify-center items-center rounded-xl border border-blue-500/20 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-blue-300 text-xl"><Scale className="h-5 w-5"/> Autoridade</div>
          <p className="mt-2 text-lg text-blue-100/80">Uma página sob medida para o seu nicho, elevando sua credibilidade e presença online.</p>
        </div>
        <div className="flex flex-col justify-center items-center rounded-xl border border-blue-500/20 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-blue-300 text-xl"><Zap className="h-5 w-5"/> Agilidade</div>
          <p className="mt-2 text-lg text-blue-100/80">Coloque no ar em minutos. Sem códigos, sem espera. A IA te guia em cada passo.</p>
        </div>
        <div className="flex flex-col justify-center items-center rounded-xl border border-blue-500/20 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-blue-300 text-xl"><ShieldCheck className="h-5 w-5"/> Ética & Segurança</div>
          <p className="mt-2 text-lg text-blue-100/80">Arquitetura moderna, performance robusta e foco na comunicação responsável.</p>
        </div>
      </div>
    </section>
  )
}


