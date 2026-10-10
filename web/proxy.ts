import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { jwtVerify } from "jose"
import { RESERVED_SLUGS } from "@/lib/reserved-slugs"
import { getAdminJwtSecret } from "@/lib/admin-secret"
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFromRequest } from "@/lib/attribution"
import { buildCsp, generateNonce, isCspProtectedPath } from "@/lib/csp"
import { SITE_HEADER, resolveActiveHostForSlug, resolveCustomHost } from "@/lib/custom-domain"
import { hostnameOf, isPlatformHost } from "@/lib/platform-host"


// Subdomain rewrite to /adv/[slug] for *.advlink.site
export async function proxy(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // CSRF: reject cross-origin state-changing API calls (cookies are same-site across *.ROOT_DOMAIN,
  // so SameSite=Lax alone doesn't stop a script on a profile subdomain).
  if (pathname.startsWith("/api") && isUnsafeMethod(req.method) && !isCsrfExempt(pathname)) {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Origem não permitida" }, { status: 403 })
    }
  }

  const isApi = pathname.startsWith("/api")
  const isNextInternal = pathname.startsWith("/_next")
  const isStaticAsset = /\.[^\/]+$/.test(pathname) || pathname === "/favicon.ico"

  // Lawyer's own domain (escritorio.adv.br): only the public site is served there
  const host = (req.headers.get("host") || "").toLowerCase()
  const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "advlink.site"
  if (!isPlatformHost(host, ROOT_DOMAIN)) {
    return customHostResponse(req, hostnameOf(host), { isApi, isNextInternal, isStaticAsset })
  }

  // Skip API and static assets from any rewrite consideration
  if (isApi || isNextInternal || isStaticAsset) {
    return NextResponse.next()
  }

  // Admin routes guard
  if (pathname.startsWith("/admin")) {
    // Allow login page
    if (pathname === "/admin/login") {
      return nextPage(req)
    }

    const token = req.cookies.get("admin-token")?.value
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl.origin))
    }

    try {
      await jwtVerify(token, getAdminJwtSecret())
      return nextPage(req)
    } catch {
      return NextResponse.redirect(new URL("/admin/login", nextUrl.origin))
    }
  }

  // Host-based routing: alex.advlink.site → rewrite to /adv/alex (URL stays on subdomain)
  // Must run BEFORE auth gate so public profiles are never blocked
  const suffix = `.${ROOT_DOMAIN}`

  if (host.endsWith(suffix) || host === ROOT_DOMAIN) {
    // Public profiles live only on their own subdomain: never serve /adv/* on app.* (same origin
    // as the dashboard/admin APIs) or under another subdomain.
    const advMatch = pathname.match(/^\/adv\/([a-z0-9-]+)\/?$/i)
    if (advMatch) {
      const proto = req.headers.get("x-forwarded-proto") ?? nextUrl.protocol.replace(":", "")
      return NextResponse.redirect(`${proto}://${advMatch[1].toLowerCase()}.${ROOT_DOMAIN}/`, 301)
    }
  }

  if (host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    const isApex = subdomain.length === 0
    if (!isApex && !RESERVED_SLUGS.has(subdomain)) {
      const target = profileRewritePath(subdomain, pathname)
      if (target) {
        // Sites with an active custom domain live there: keep a single canonical host
        const customHost = /^[a-z0-9-]+$/.test(subdomain) ? await resolveActiveHostForSlug(subdomain) : null
        if (customHost) {
          return NextResponse.redirect(`https://${customHost}${pathname}${nextUrl.search}`, 301)
        }
        const url = nextUrl.clone()
        url.pathname = target
        return NextResponse.rewrite(url)
      }
    }
  }

  // Auth gate only for dashboard routes (app.advlink.site or main domain)
  const isDashboardRoute = pathname === "/" || pathname.startsWith("/onboarding") || pathname.startsWith("/profile")
  if (isDashboardRoute) {
    const isLoginRoute = pathname.startsWith("/login")
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token && !isLoginRoute) {
      const signInUrl = new URL("/login", nextUrl.origin)
      // Relative path: behind the reverse proxy nextUrl.origin is the container's (0.0.0.0:80)
      signInUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`)
      return withAttribution(req, NextResponse.redirect(signInUrl))
    }
    return withAttribution(req, nextPage(req))
  }

  return withAttribution(req, nextPage(req))
}

/** Internal page behind a public-site path (/, /privacidade, /artigos[/<slug>]), or null. */
function profileRewritePath(slug: string, pathname: string): string | null {
  if (pathname === "/") return `/adv/${slug}`
  if (pathname === "/privacidade") return `/adv/${slug}/privacidade`
  if (/^\/artigos(?:\/[a-z0-9-]+)?$/.test(pathname)) return `/adv/${slug}${pathname}`
  return null
}

const CUSTOM_HOST_APIS = ["/api/analytics/track", "/api/leads"]

/**
 * Custom domains serve only the public site: no admin, auth gate or CSP (same as subdomains).
 * Unknown hosts and any other path get a 404.
 */
async function customHostResponse(
  req: NextRequest,
  hostname: string,
  kind: { isApi: boolean; isNextInternal: boolean; isStaticAsset: boolean },
) {
  const notFound = () => new NextResponse("Not found", { status: 404 })
  let site: Awaited<ReturnType<typeof resolveCustomHost>>
  try {
    site = await resolveCustomHost(hostname)
  } catch {
    return new NextResponse("Service unavailable", { status: 503 })
  }
  if (!site) return notFound()

  const { pathname } = req.nextUrl
  if (kind.isApi) {
    return CUSTOM_HOST_APIS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? NextResponse.next() : notFound()
  }
  if (kind.isNextInternal || kind.isStaticAsset) return NextResponse.next()

  const target = profileRewritePath(site.slug, pathname)
  if (!target) return notFound()
  const url = req.nextUrl.clone()
  url.pathname = target
  const res = NextResponse.rewrite(url)
  res.headers.set(SITE_HEADER, site.profileId)
  return res
}

// Continues to the page. Private areas get a per-request nonce: Next reads it from the request's
// Content-Security-Policy header and stamps it on its own scripts; the root layout reads `x-nonce`
// for our inline scripts. See lib/csp.ts for the scope (public profiles are excluded).
function nextPage(req: NextRequest) {
  if (!isCspProtectedPath(req.nextUrl.pathname)) return NextResponse.next()

  const nonce = generateNonce()
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set("Content-Security-Policy", csp)
  return res
}

// First-touch attribution for app pages (login, onboarding, dashboard): kept for 90 days and
// attached to the user_signed_up / site_created events. Never overwritten once set.
function withAttribution(req: NextRequest, res: NextResponse) {
  if (req.method !== "GET" || req.cookies.has(ATTRIBUTION_COOKIE)) return res
  const data = attributionFromRequest(req.nextUrl, req.headers.get("referer"))
  if (!data) return res
  res.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(data), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    maxAge: ATTRIBUTION_MAX_AGE,
  })
  return res
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())
}

// Server-to-server callers (token-authenticated webhooks) and NextAuth (has its own CSRF token).
function isCsrfExempt(pathname: string) {
  return (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/auth/")
  )
}

function isSameOriginRequest(req: NextRequest) {
  const host = req.headers.get("host")
  const origin = req.headers.get("origin")
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  // No Origin (old browsers / non-browser clients): fall back to Fetch Metadata when present.
  const site = req.headers.get("sec-fetch-site")
  return !site || site === "same-origin" || site === "none"
}

// Run on all paths except Next internals and common static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}


