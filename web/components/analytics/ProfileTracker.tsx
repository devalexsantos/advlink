"use client"

import { useEffect } from "react"

export function ProfileTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        slug,
        referrer: document.referrer || null,
        path: window.location.pathname,
      })
      const url = "/api/analytics/track"
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob)
      } else {
        fetch(url, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {})
      }
    } catch {
      // ignore
    }
  }, [slug])

  return null
}
