import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Subdomain rewrite to /adv/[slug] for *.advlink.site
export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // Only run auth gate for dashboard-only routes to avoid affecting public pages
  const isDashboardRoute = pathname.startsWith("/onboarding") || pathname.startsWith("/profile")
  if (isDashboardRoute) {
    const isLoginRoute = pathname.startsWith("/login")
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token && !isLoginRoute) {
      const signInUrl = new URL("/login", nextUrl.origin)
      signInUrl.searchParams.set("callbackUrl", nextUrl.href)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next()
  }

  // Skip API and static assets from any rewrite consideration
  const isApi = pathname.startsWith("/api")
  const isNextInternal = pathname.startsWith("/_next")
  const isStaticAsset = /\.[^\/]+$/.test(pathname) || pathname === "/favicon.ico"
  if (isApi || isNextInternal || isStaticAsset) {
    return NextResponse.next()
  }

  // Host-based routing: alex.advlink.site → rewrite to /adv/alex (URL stays on subdomain)
  const host = req.headers.get("host") || ""
  const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "advlink.site"

  // Only handle our configured root domain
  const suffix = `.${ROOT_DOMAIN}`
  if (host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    const isApex = subdomain.length === 0
    const ignoredSubs = new Set(["www", "app"]) // add any other reserved subdomains here

    if (!isApex && !ignoredSubs.has(subdomain)) {
      // Only rewrite root path to avoid catching asset routes
      if (pathname === "/") {
        const url = nextUrl.clone()
        url.pathname = `/adv/${subdomain}`
        return NextResponse.rewrite(url)
      }
    }
  }

  return NextResponse.next()
}

// Run on all paths except Next internals and common static files
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}


