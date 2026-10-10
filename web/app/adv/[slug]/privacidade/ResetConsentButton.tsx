"use client"

import { clearGtmConsent } from "@/lib/gtm-consent"

/** Forgets the visitor's cookie choice and reloads, so the banner asks again. */
export function ResetConsentButton({ gtmContainerId }: { gtmContainerId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        clearGtmConsent(gtmContainerId)
        window.location.reload()
      }}
      className="mt-3 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Alterar minha escolha de cookies
    </button>
  )
}
