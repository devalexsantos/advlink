"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Wand2, ArrowRight, WandSparkles, User } from "lucide-react"
import logo from "@/assets/icons/logo.svg"
import Image from "next/image"
export function Hero() {
  const sceneRef = useRef<HTMLDivElement>(null)

  return (
    <header ref={sceneRef} className="relative isolate overflow-hidden">
      {/* Geometric background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950 to-black" />
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.56]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 60%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 32%, transparent 55%)",
          filter: "blur(28px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "linear-gradient(transparent 95%, rgba(255,255,255,.08) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.08) 95%)", backgroundSize: "28px 28px" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "conic-gradient(from_45deg,#2b2b2b20,#0000 20%,#2b2b2b20 40%,#0000 60%,#2b2b2b20 80%,#0000)", WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)" }} />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 py-28 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-1 text-xs tracking-wide text-zinc-300">
          <Wand2 className="h-4 w-4" /> Crie sua landing page jurídica com IA em minutos
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Image src={logo} alt="Logo" width={80} height={80} className="w-20 h-20" />
          <span className="text-2xl md:text-6xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-300 to-zinc-400 bg-clip-text text-transparent [text-shadow:0_1px_0_#fff,0_2px_10px_rgba(255,255,255,0.12)]">
            AdvLink
          </span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-300 to-zinc-400 bg-clip-text text-transparent [text-shadow:0_1px_0_#fff,0_2px_10px_rgba(255,255,255,0.12)]"
        >
          Site de <span className="text-amber-400">advocacia</span> em menos de <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-zinc-50">5 minutos</span>
              <svg aria-hidden viewBox="0 0 200 24" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-1 left-0 h-4 w-full">
                <path d="M2 16 C 60 8, 140 8, 198 16" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none" />
              </svg>
            </span>
        </h1>
        <div className="flex flex-col gap-4 justify-center items-center mt-4 max-w-2xl text-zinc-300/90 text-lg">
        <h3 className="text-center text-xl">
          Gere uma página moderna focada em <strong className="text-amber-400">advogados e escritórios de advocacia</strong>, rápida e persuasiva para captar clientes. Personalize cores, áreas de atuação e apresente seus diferenciais
        </h3>
          <div className="text-zinc-200 flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-zinc-900/70 border border-zinc-700">
            <WandSparkles className="h-4 w-4" /> 
           <span className="font-bold">com auxílio de IA</span>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-full border border-amber-400 bg-gradient-to-b from-amber-500 to-amber-700 px-6 py-3 text-white font-bold [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.25)] hover:from-amber-400 hover:to-amber-600 transition text-xl">
            Criar minha página
            <ArrowRight className="h-4 w-4 transition -translate-x-0 group-hover:translate-x-0.5" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-transparent px-6 py-3 text-zinc-200 hover:bg-zinc-900/70 transition">
            <User className="h-4 w-4" />
            Entrar
          </Link>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 md:h-40 bg-gradient-to-b from-transparent to-black z-20" />
    </header>
  )
}


