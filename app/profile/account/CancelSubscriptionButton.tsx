"use client"

import { useState } from "react"
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

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")

  async function cancel() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      })
      if (res.ok) setDone(true)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  if (done) {
    return <p className="text-sm text-amber-400">Sua assinatura será cancelada ao final do período atual.</p>
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
              Antes de continuar, poderia nos dizer o motivo do cancelamento? Sua resposta nos ajuda a melhorar. Você manterá o acesso até o fim do período atual.
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


