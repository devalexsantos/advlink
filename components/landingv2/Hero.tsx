"use client"

import { useRef } from "react"
import Link from "next/link"
import { Wand2, ArrowRight, WandSparkles, User } from "lucide-react"
import lightLogo from "/public/images/advlink-logo-black.svg"
import goldLogo from "/public/images/advlink-gold-logo.svg"
import mockup from "/public/images/advlink-mockup-iphone-black.png"
import Image from "next/image"
export function Hero() {
  const sceneRef = useRef<HTMLDivElement>(null)

  return (
    <header ref={sceneRef} className="relative isolate overflow-hidden">
      {/* Light background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-zinc-100" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.3]" style={{ backgroundImage: "radial-gradient(circle at 50% 60%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 32%, transparent 55%)", filter: "blur(24px)" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10" style={{ backgroundImage: "linear-gradient(transparent 95%, rgba(0,0,0,.06) 95%), linear-gradient(90deg, transparent 95%, rgba(0,0,0,.06) 95%)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 py-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-1 text-xs tracking-wide text-zinc-700">
          <Wand2 className="h-4 w-4" /> Crie sua landing page jurídica com IA em minutos
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center w-full">
          {/* Left: text */}
          <div className="flex flex-col gap-3">
            <Image src={lightLogo} alt="Logo" width={120} height={120} className="w-30 h-30" />
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-zinc-900">
              Site de <span className="text-amber-600">advocacia</span> em menos de <br />
              <span className="relative inline-block">
                <span className="relative z-10">5 minutos</span>
                <svg aria-hidden viewBox="0 0 200 24" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-1 left-0 h-4 w-full">
                  <path d="M2 16 C 60 8, 140 8, 198 16" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-700 text-lg">
              Gere uma página moderna focada em <strong className="text-amber-700">advogados e escritórios de advocacia</strong>, rápida e persuasiva para captar clientes. Personalize cores, áreas de atuação e apresente seus diferenciais.
            </p>
            <div className="text-zinc-800 flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-white border border-zinc-200 w-fit">
              <WandSparkles className="h-4 w-4" /> <span className="font-semibold">com auxílio de IA</span>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link href="/login" className="group inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-white font-bold hover:from-amber-300 hover:to-amber-500 transition text-xl">
                Criar minha página
                <ArrowRight className="h-4 w-4 transition -translate-x-0 group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-zinc-800 hover:bg-zinc-50 transition">
                <User className="h-4 w-4" />
                Entrar
              </Link>
            </div>
          </div>

          {/* Right: mockup image */}
          <div className="relative w-full flex justify-center">
            <div className="relative">
              <Image src={mockup} alt="Exemplo de uso" width={480} height={480} className="w-full max-w-md h-auto" />
              <div className="pointer-events-none absolute inset-0 -z-10 blur-2xl rounded-full bg-amber-200/40" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}



