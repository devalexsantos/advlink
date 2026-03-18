"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewSitePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Digite um nome para o site")
      return
    }
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Erro ao criar site")
        return
      }
      router.push("/onboarding/profile")
    } catch {
      setError("Erro ao criar site")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Dê um nome ao seu novo site</h1>
          <p className="text-muted-foreground text-sm">
            Escolha um nome interno para identificar este site (ex: &quot;Escritório SP&quot;, &quot;Site Pessoal&quot;).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do site"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              maxLength={100}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Criando..." : "Continuar"}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/profile/edit"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
