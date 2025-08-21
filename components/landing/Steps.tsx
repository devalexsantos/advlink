"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Brush, CreditCard, Rocket, UserCircle2, WandSparkles } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

type Step = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; image: string; alt: string }

const steps: Step[] = [
  { icon: UserCircle2, title: "Informações Iniciais", desc: "Preencha suas informações iniciais para começar.", image: "/steps/step-01.png", alt: "Criação de conta" },
  { icon: Brush, title: "Personalize seu site", desc: "Escolha tema, cores e edite seu conteúdo.", image: "/steps/step-02.png", alt: "Personalização" },
  { icon: WandSparkles, title: "Use IA nas descrições", desc: "Gere textos para suas áreas com auxílio de IA. Adicione foto de capa e galeria.", image: "/steps/step-03.png", alt: "Editor com IA" },
  { icon: CreditCard, title: "Preview ", desc: "Veja como ficou sua página no celular e desktop antes de publicar.", image: "/steps/step-04.png", alt: "Preview" },
  { icon: Rocket, title: "Publique", desc: "Compartilhe seu link único do AdvLink.", image: "/steps/step-05.png", alt: "Publicação" },
]

export function Steps() {
  const [active, setActive] = useState<number>(0)
  const [manual, setManual] = useState<boolean>(false)

  useEffect(() => {
    if (manual) return
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length)
    }, 3500)
    return () => clearInterval(id)
  }, [manual])

  return (
    <section className="relative px-6 py-12 md:py-24">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6"
          >
            Como publicar em minutos
          </motion.h2>
          <div className="space-y-3">
            {steps.map((s, idx) => {
              const Icon = s.icon
              const isActive = active === idx
              return (
                <button
                  key={s.title}
                  onClick={() => { setManual(true); setActive(idx) }}
                  className={`w-full text-left rounded-xl p-4 flex items-start gap-3 transition-colors border ${
                    isActive
                      ? "border-amber-400/60 bg-zinc-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className={`rounded-md p-2 mt-0.5 border ${isActive ? "border-zinc-300/60 bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isActive ? "text-zinc-50" : ""}`}>{s.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 grid place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/40"
              >
                <Image src={steps[active].image} alt={steps[active].alt} width={640} height={740} quality={100} className="h-full w-full object-contain rounded-2xl p-6" />
              </motion.div>
            </AnimatePresence>
          </div>
      </div>
    </section>
  )
}


