"use client"

import { useCallback, useSyncExternalStore } from "react"
import Script from "next/script"
import { gtmConsentKey, readGtmConsent, type GtmConsentChoice } from "@/lib/gtm-consent"

const CHANGE_EVENT = "advlink:gtm-consent"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

type Props = {
  /** Already validated container ID (GTM-XXXX) */
  gtmContainerId: string
  /** Where "Saiba mais" points (the site's privacy notice) */
  privacyUrl: string
}

/**
 * Loads Google Tag Manager only after the visitor accepts. Until a choice exists it shows a small
 * card at the bottom-left, leaving the bottom-right corner free for the themes' floating
 * WhatsApp/phone buttons (fixed bottom-4 right-4).
 */
export function GtmConsent({ gtmContainerId, privacyUrl }: Props) {
  // Server snapshot "pending": nothing is rendered until the browser value is known (no flash)
  const choice = useSyncExternalStore<GtmConsentChoice | "none" | "pending">(
    subscribe,
    () => readGtmConsent(gtmContainerId) ?? "none",
    () => "pending"
  )

  const decide = useCallback(
    (value: GtmConsentChoice) => {
      try {
        window.localStorage.setItem(gtmConsentKey(gtmContainerId), value)
      } catch {
        // storage blocked: the choice only lasts until the next navigation
      }
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [gtmContainerId]
  )

  if (choice === "pending" || choice === "denied") return null

  if (choice === "granted") {
    return (
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmContainerId)});`,
        }}
      />
    )
  }

  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900"
  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 left-4 right-20 z-40 max-w-md rounded-xl border border-neutral-200 bg-white p-4 text-neutral-800 shadow-lg"
    >
      <p className="text-sm leading-snug">
        Este site usa cookies de terceiros (Google Tag Manager) para medir visitas, apenas com o seu consentimento.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide("granted")}
          className={`rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 ${focus}`}
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          className={`rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 ${focus}`}
        >
          Recusar
        </button>
        <a
          href={privacyUrl}
          className={`rounded-md px-1 py-1.5 text-sm text-neutral-600 underline underline-offset-2 hover:text-neutral-900 ${focus}`}
        >
          Saiba mais
        </a>
      </div>
    </div>
  )
}
