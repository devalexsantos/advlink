"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)

  async function cancel() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/cancel-subscription", { method: "POST" })
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
          <p className="text-sm text-zinc-300">
            Tem certeza de que deseja cancelar sua assinatura? Você manterá o acesso até o fim do período atual.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="cursor-pointer">Voltar</Button>
            <Button type="button" variant="destructive" onClick={cancel} disabled={loading} className="cursor-pointer">
              {loading ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


