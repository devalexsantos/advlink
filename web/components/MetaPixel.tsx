'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export default function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRender = useRef(true)

  useEffect(() => {
    if (!window.fbq) return
    // Evita duplicar o PageView inicial que já é disparado no script de init
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.fbq('track', 'PageView')
  }, [pathname, searchParams])

  return null
}