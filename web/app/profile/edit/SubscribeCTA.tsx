"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Rocket } from "lucide-react"

export default function SubscribeCTA() {
  const [loading, setLoading] = useState(false)

  async function startCheckout() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" })
      if (!res.ok) return
      const payload = await res.json() as { url?: string }
      if (payload?.url) window.location.href = payload.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mb-4 rounded-xl border bg-opacity-10 p-4 md:p-5 border-amber-500/60 bg-amber-500/10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-sm md:text-base text-amber-800">
            <span className="font-semibold text-amber-700">Sua página ainda não está publicada.</span>
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <Button
            type="button"
            onClick={startCheckout}
            disabled={loading}
            className="w-full md:w-auto gap-2 cursor-pointer border border-purple-400 bg-purple-600 text-white hover:bg-purple-500"
          >
            {loading ? (
              "Redirecionando..."
            ) : (
              <span className="inline-flex items-center gap-2">
                Publicar página <Rocket className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
