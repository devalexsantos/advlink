"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Rocket } from "lucide-react"

export default function ActivateSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function startCheckout() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" })
      if (!res.ok) return
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className="gap-2 cursor-pointer border border-purple-400 bg-purple-600 text-white hover:bg-purple-500"
    >
      {loading ? "Redirecionando..." : (
        <span className="inline-flex items-center gap-2">Ativar assinatura <Rocket className="w-4 h-4" /></span>
      )}
    </Button>
  )
}


