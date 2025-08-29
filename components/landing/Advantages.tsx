"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Image as ImageIcon, Link2, Palette, ShieldCheck, Sparkles, MapPin, Calendar, Rocket, Layers, Eye, LayoutGrid, FileText } from "lucide-react"

const items = [
  { icon: Sparkles, title: "Editor com IA", desc: "Gere textos coerentes para suas áreas de atuação com auxílio de IA." },
  { icon: Layers, title: "Temas modernos", desc: "Temas pensados para a área de advocacia e adapatados para celulares." },
  { icon: Palette, title: "Cores personalizadas", desc: "Defina cores da página, dos títulos e dos textos." },
  { icon: Link2, title: "Seção de Links", desc: "Adicione links para suas postagens no Instagram, Facebook, etc." },
  { icon: ImageIcon, title: "Galeria de fotos", desc: "Publique imagens em carrossel com visualização em modal." },
  { icon: LayoutGrid, title: "Áreas de atuação", desc: "Crie, edite e reordene suas áreas de atuação com descrições ricas." },
  { icon: Calendar, title: "Integração Calendly", desc: "Integre o Calendly e tenha agendamentos direto na sua página." },
  { icon: MapPin, title: "Endereço público opcional", desc: "Mostre a localização do seu escritório com mapa interativo do Google Maps." },
  { icon: Eye, title: "Pré-visualização em tempo real", desc: "Veja como sua página ficará enquanto edita." },
  { icon: FileText, title: "SEO pronto", desc: "Campos de Meta Title, Description, keywords e tudo que sua página precisa para ser encontrada no Google." },
  { icon: ShieldCheck, title: "Publicação segura", desc: "Sua página rápida, hospedada e mantida pela nossa equipe. Não se preocupe com manutenção." },
  { icon: Rocket, title: "Sem código", desc: "Não precisa de conhecimento em programação para criar sua página. É tudo intuitivo e automático." },
]

export function Advantages() {
  return (
    <section className="relative px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-3xl md:text-5xl font-extrabold tracking-tight mb-10"
        >
          Por que usar o AdvLink?
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it, idx) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.3) }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-2">
                  <it.icon className="w-5 h-5 text-zinc-200" />
                </div>
                <div>
                  <h3 className="font-semibold">{it.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">{it.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* subtle lines/bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]">
        <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(transparent 95%, rgba(255,255,255,.15) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.15) 95%)", backgroundSize: "30px 30px" }} />
      </div>
    </section>
  )
}


