"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/onboarding"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true,
    })
    // next-auth cuida do redirect; se falhar e não redirecionar, cai aqui
    if (!res?.ok) setError("Credenciais inválidas.")
    setLoading(false)
  }

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-100 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Entrando..." : "Entrar"}</Button>
      </form>
    </div>
  )
}


