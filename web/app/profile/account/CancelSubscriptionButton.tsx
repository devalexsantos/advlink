"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const CANCEL_REASONS = [
  "Não vi valor suficiente para meu escritório",
  "O site não ficou como eu esperava (design/tema)",
  "Recursos importantes faltando",
  "Dificuldade para publicar/atualizar conteúdo",
  "Velocidade/performance do site insatisfatória",
  "Instabilidade/erros recorrentes",
  "Não faz mais sentido para mim",
  "Preço muito alto",
  "Outro",
]

function formatDate(date: string) {
  const [y, m, d] = date.split("-")
  return `${d}/${m}/${y}`
}

export default function CancelSubscriptionButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ activeUntil: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")

  async function cancel() {
    setError(null)
    try {
      setLoading(true)
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível cancelar agora. Tente novamente ou fale com o suporte.")
        return
      }
      setDone({ activeUntil: data.activeUntil ?? null })
      setOpen(false)
      router.refresh()
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Assinatura cancelada.{" "}
        {done.activeUntil ? `Seu site continua no ar até ${formatDate(done.activeUntil)}.` : "Seu site saiu do ar."}
      </p>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="cursor-pointer"
      >
        Cancelar assinatura
      </Button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-zinc-300">
            <p className="text-sm">
              Antes de continuar, poderia nos dizer o motivo do cancelamento? Sua resposta nos ajuda a melhorar. Seu site continua no ar até o fim do período já pago.
            </p>
            <div>
              <Label className="mb-2 block">Motivo do cancelamento</Label>
              <select
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-50"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Selecione um motivo</option>
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block">Descreva um pouco mais (opcional)</Label>
              <Textarea
                rows={4}
                placeholder="Conte um pouco mais sobre o motivo..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="cursor-pointer">Fechar</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={cancel}
              disabled={loading || !reason}
              className="cursor-pointer"
            >
              {loading ? "Cancelando..." : "Cancelar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


