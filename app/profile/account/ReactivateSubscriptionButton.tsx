"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function ReactivateSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function reactivate() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/reactivate-subscription", { method: "POST" })
      if (res.ok) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) return <p className="text-sm text-sky-400">Assinatura reativada com sucesso.</p>

  return (
    <Button type="button" variant="secondary" onClick={reactivate} disabled={loading} className="cursor-pointer">
      {loading ? "Reativando..." : "Reativar assinatura"}
    </Button>
  )
}


