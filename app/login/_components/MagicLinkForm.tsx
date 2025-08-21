"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Link2, Mail } from "lucide-react"

export function MagicLinkForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/onboarding/profile",
      })
      if (res?.error) {
        setError("Não foi possível enviar o link. Verifique o e-mail.")
      } else {
        setSent(true)
      }
    } catch (e) {
      setError("Ocorreu um erro ao enviar o link.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-blue-100">
        <div className="mb-2 flex items-center gap-2 text-blue-200">
          <Mail className="h-4 w-4" />
          <span className="text-sm font-medium">Verifique seu e-mail</span>
        </div>
        <p className="text-sm">Enviamos um link de acesso para <strong>{email}</strong>. Abra o e-mail para continuar.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-blue-200">
        <Link2 className="h-4 w-4" />
        <span className="text-sm font-medium">Magic Link</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="email" className="text-blue-100/90">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-zinc-900/60 border-zinc-700 text-blue-50 placeholder:text-blue-200/50"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleSend} disabled={loading || !email} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
            {loading ? "Enviando..." : "Enviar link de acesso"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  )
}


