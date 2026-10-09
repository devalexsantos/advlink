"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Site = { id: string; setupComplete: boolean }

/**
 * "Voltar ao dashboard" from onboarding. Switches the active site to a completed one first:
 * /profile/edit sends incomplete sites back to onboarding, so a plain link would loop.
 * Renders nothing when the user has no completed site to go back to.
 */
export default function BackToDashboardLink({ siteId: initialSiteId }: { siteId?: string | null }) {
  const router = useRouter()
  const [siteId, setSiteId] = useState<string | null>(initialSiteId ?? null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (initialSiteId !== undefined) return
    let cancelled = false
    fetch("/api/sites")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sites?: Site[] } | null) => {
        const completed = data?.sites?.find((s) => s.setupComplete)
        if (!cancelled && completed) setSiteId(completed.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [initialSiteId])

  if (!siteId) return null

  async function handleClick() {
    setPending(true)
    try {
      await fetch("/api/sites/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      })
    } finally {
      router.push("/profile/edit")
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer disabled:opacity-50"
    >
      Voltar ao dashboard
    </button>
  )
}
