'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { getRootDomain } from '@/lib/site-url'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? '1003801661770634'

/**
 * The AdvLink pixel belongs to the AdvLink funnel only (login, onboarding, dashboard). It must not
 * run on lawyers' public sites (<slug>.ROOT_DOMAIN, or /adv/*) — that would track their visitors
 * for us (LGPD) and pollute our audiences — nor on the internal admin.
 */
export function shouldLoadPixel(hostname: string, pathname: string, rootDomain = getRootDomain()) {
  if (pathname.startsWith('/adv/') || pathname.startsWith('/admin')) return false
  const root = rootDomain.split(':')[0]
  if (hostname.endsWith(`.${root}`) && hostname !== `app.${root}`) return false
  return true
}

export default function MetaPixel({ nonce }: { nonce?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [enabled, setEnabled] = useState(false)
  const firstRender = useRef(true)

  useEffect(() => {
    // Decided on the client: the server can't tell a rewritten subdomain request from the app root
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(shouldLoadPixel(window.location.hostname, pathname))
  }, [pathname])

  useEffect(() => {
    if (!enabled) return
    // Evita duplicar o PageView inicial que já é disparado no script de init
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.fbq?.('track', 'PageView')
  }, [enabled, pathname, searchParams])

  if (!enabled) return null

  return (
    // Inline script: under the private areas' CSP it only runs with the request nonce (the
    // fbevents.js it injects is then trusted through 'strict-dynamic').
    <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce}>
      {`
        !function(f,b,e,v,n,t,s){
          if(f.fbq)return; n=f.fbq=function(){ n.callMethod ?
            n.callMethod.apply(n,arguments) : n.queue.push(arguments) }
          ;
          if(!f._fbq) f._fbq=n;
          n.push=n; n.loaded=!0; n.version='2.0';
          n.queue=[];
          t=b.createElement(e); t.async=!0;
          t.src=v;
          s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', ${JSON.stringify(FB_PIXEL_ID)});
        fbq('track', 'PageView');
      `}
    </Script>
  )
}
