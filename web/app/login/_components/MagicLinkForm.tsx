"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Link2, Mail } from "lucide-react"
import { DEFAULT_CALLBACK } from "@/lib/safe-callback"

const RESEND_COOLDOWN_S = 30

export function MagicLinkForm({ callbackUrl = DEFAULT_CALLBACK }: { callbackUrl?: string }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function send() {
    setLoading(true)
    setError(null)
    try {
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
      })
      if (res?.error) {
        setError("Não foi possível enviar o link. Verifique o e-mail e tente novamente.")
      } else {
        setSent(true)
        setCooldown(RESEND_COOLDOWN_S)
      }
    } catch {
      setError("Ocorreu um erro ao enviar o link. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || loading) return
    void send()
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-emerald-900">
        <div className="mb-2 flex items-center gap-2 text-emerald-700">
          <Mail className="h-4 w-4" />
          <span className="text-sm font-medium">Verifique seu e-mail</span>
        </div>
        <p className="text-sm">
          Enviamos um link de acesso para <strong>{email}</strong>. Abra o e-mail para continuar. Não chegou? Confira a
          caixa de spam.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void send()} disabled={loading || cooldown > 0}>
            {loading ? "Reenviando..." : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSent(false)
              setError(null)
            }}
          >
            Usar outro e-mail
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Link2 className="h-4 w-4" />
        <span className="text-sm font-medium">Acessar com E-mail</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="email" className="text-foreground">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={loading || !email} className="w-full">
            {loading ? "Enviando..." : "Enviar link de acesso"}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
  )
}
