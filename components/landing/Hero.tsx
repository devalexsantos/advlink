"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Wand2, ArrowRight, WandSparkles } from "lucide-react"

export function Hero() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const layer1Ref = useRef<HTMLDivElement>(null)
  const layer2Ref = useRef<HTMLDivElement>(null)
  const layer3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width
      const dy = (e.clientY - cy) / rect.height
      const tx1 = `translate3d(${dx * 12}px, ${dy * 12}px, 0)`
      const tx2 = `translate3d(${dx * -18}px, ${dy * -18}px, 0)`
      const tx3 = `translate3d(${dx * 30}px, ${dy * 30}px, 0)`
      if (layer1Ref.current) layer1Ref.current.style.transform = tx1
      if (layer2Ref.current) layer2Ref.current.style.transform = tx2
      if (layer3Ref.current) layer3Ref.current.style.transform = tx3
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  return (
    <header ref={sceneRef} className="relative isolate overflow-hidden">
      {/* Animated gradient blobs */}
      <div ref={layer1Ref} className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-700/30 blur-3xl animate-pulse" />
      <div ref={layer2Ref} className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-[pulse_5s_ease-in-out_infinite]" />
      <div ref={layer3Ref} className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/25 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />

      {/* Parallax foreground lines */}
      <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <svg aria-hidden viewBox="0 0 1200 600" className="h-full w-full">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#60a5fa" stopOpacity="0.25" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <g stroke="url(#g)" strokeWidth="1">
            {Array.from({ length: 24 }).map((_, i) => (
              <path key={i} d={`M-50 ${i * 30} L1250 ${i * 30}`} />
            ))}
          </g>
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 py-28 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs tracking-wide text-blue-200">
          <Wand2 className="h-4 w-4" /> Crie sua landing page jurídica com IA em minutos
        </div>
        <h1
          className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(59,130,246,0.25)]"
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(59,130,246,0.25)" }}
        >
          Site de advocacia em menos de <br />
            5 minutos
        </h1>
        <div className="flex flex-col gap-4 justify-center items-center mt-4 max-w-2xl text-blue-200/80 text-lg">
        <h2 className="text-center text-xl">
          Gere uma página moderna focada em <strong>advogados e escritórios de advocacia</strong>, rápida e persuasiva para captar clientes. Personalize cores, áreas de atuação e apresente seus diferenciais
        </h2>
          <div className="text-blue-200 flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
            <WandSparkles className="h-4 w-4" /> 
           <span className="font-bold">tudo com auxílio de IA</span>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/onboarding" className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-500 transition">
            Testar grátis
            <ArrowRight className="h-4 w-4 transition -translate-x-0 group-hover:translate-x-0.5" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-md border border-blue-500/40 bg-transparent px-6 py-3 text-blue-200 hover:bg-blue-500/10 transition">
            Entrar
          </Link>
        </div>
      </div>
      {/* Bottom fade to blend hero into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 md:h-40 bg-gradient-to-b from-transparent to-[#0a0f1a] z-20" />
    </header>
  )
}


