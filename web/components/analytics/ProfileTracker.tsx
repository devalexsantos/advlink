"use client"

import { useEffect } from "react"
import { classifyContactHref } from "@/lib/contact-clicks"

const TRACK_URL = "/api/analytics/track"

function sendBeacon(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_URL, new Blob([payload], { type: "application/json" }))
    } else {
      fetch(TRACK_URL, {
        method: "POST",
        body: payload,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => {})
    }
  } catch {
    // ignore
  }
}

export function ProfileTracker({ slug }: { slug: string }) {
  useEffect(() => {
    sendBeacon({
      slug,
      referrer: document.referrer || null,
      path: window.location.pathname,
    })

    // Contact clicks: only the channel is sent, never the number/address/URL (LGPD).
    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!anchor) return
      const kind = classifyContactHref(anchor.getAttribute("href") ?? "", window.location.host)
      if (kind) sendBeacon({ slug, type: "contact", kind })
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [slug])

  return null
}
