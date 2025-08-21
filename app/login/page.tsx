import { Suspense } from "react"
import Image from "next/image"
import logo from "@/assets/icons/logo.svg"
import { Apple, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleLoginButton } from "@/app/login/_components/GoogleLoginButton"
import { MagicLinkForm } from "@/app/login/_components/MagicLinkForm"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a] text-blue-50">
      {/* Background animated blobs to match landing */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-700/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-[pulse_5s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/25 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />

      {/* Foreground subtle lines */}
      <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <svg aria-hidden viewBox="0 0 1200 600" className="h-full w-full">
          <defs>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#60a5fa" stopOpacity="0.25" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <g stroke="url(#g2)" strokeWidth="1">
            {Array.from({ length: 24 }).map((_, i) => (
              <path key={i} d={`M-50 ${i * 30} L1250 ${i * 30}`} />
            ))}
          </g>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <Image src={logo} alt="Logo" width={40} height={40} className="h-10 w-10" />
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-blue-200 bg-clip-text text-transparent">
            AdvLink
          </span>
        </div>

        <div className="w-full max-w-xl rounded-2xl border border-blue-500/30 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-blue-200 bg-clip-text text-transparent">
              Entrar na plataforma
            </h1>
            <p className="mt-2 text-blue-200/80 text-sm">
              Escolha um método para continuar. Não se preocupe, é rápido e seguro.
            </p>
          </div>

          {/* Magic Link */}
          <Suspense>
            <MagicLinkForm />
          </Suspense>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            <span className="text-xs uppercase tracking-widest text-blue-200/60">ou</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          </div>

          {/* Social providers - visual only */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <GoogleLoginButton />
            <Button type="button" variant="secondary" className="flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-blue-50">
              <Apple className="h-4 w-4" />
              Continuar com Apple
            </Button>
          </div>

          {/* Security footnote */}
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-blue-200/60">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              <span>Seus dados de acesso são protegidos e criptografados.</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Ao continuar, você concorda com nossos termos de uso e política de privacidade.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


