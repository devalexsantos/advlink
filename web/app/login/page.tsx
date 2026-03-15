import { Suspense } from "react"
import Image from "next/image"
import { Lock, ShieldCheck } from "lucide-react"
import { GoogleLoginButton } from "@/app/login/_components/GoogleLoginButton"
import { MagicLinkForm } from "@/app/login/_components/MagicLinkForm"
import blackLogo from "@/public/images/advlink-logo-black.svg"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error: rawError } = await searchParams
  const error = (rawError as string | undefined) ?? undefined
  const isOAuthAccountNotLinked = error === "OAuthAccountNotLinked"
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-muted/40 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-muted/30 blur-3xl animate-[pulse_5s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/20 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />

      {/* Foreground subtle lines */}
      <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <svg aria-hidden viewBox="0 0 1200 600" className="h-full w-full">
          <defs>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#d4d4d8" stopOpacity="0.30" />
              <stop offset="1" stopColor="#a1a1aa" stopOpacity="0.30" />
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
          <Image src={blackLogo} alt="Logo" width={80} height={80} className="w-20 h-20" />
        </div>

        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground">
              Entrar na plataforma
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Escolha um método para continuar. Não se preocupe, é rápido e seguro.
            </p>
          </div>

          {isOAuthAccountNotLinked && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700">
              <p className="text-sm">
                Detectamos que este e-mail já foi usado com outro método de acesso.
                Faça login usando o <strong>Acessar com E-mail</strong> abaixo para continuar ou use o mesmo método da última vez.
              </p>
            </div>
          )}

          {/* Acessar com E-mail */}
          <Suspense>
            <MagicLinkForm />
          </Suspense>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Social providers */}
          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>

          {/* Security footnote */}
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
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
