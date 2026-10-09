"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Rocket } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getProfileHost } from "@/lib/site-url"
import { fetchProfile } from "./api"
import ChangeSlugButton from "./ChangeSlugButton"

export default function SubscribeCTA() {
  const [loading, setLoading] = useState(false)
  const { data } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })
  const slug = data?.profile?.slug ?? ""

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
          <div className="text-sm md:text-base text-amber-800">
            <p>
              <span className="font-semibold text-amber-700">Sua página ainda não está publicada.</span>
            </p>
            {slug && (
              <p className="mt-1">
                Seu endereço será <strong className="break-all">{getProfileHost(slug)}</strong>
                <ChangeSlugButton
                  effectiveSlug={slug}
                  label="Alterar link"
                  className="ml-2 h-auto px-1 py-0 cursor-pointer text-amber-900 underline underline-offset-4 bg-transparent hover:bg-transparent shadow-none"
                />
              </p>
            )}
          </div>
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
