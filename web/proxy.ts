import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { jwtVerify } from "jose"
import { RESERVED_SLUGS } from "@/lib/reserved-slugs"

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "admin-secret-change-me"
)

// Subdomain rewrite to /adv/[slug] for *.advlink.site
export async function proxy(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // Skip API and static assets from any rewrite consideration
  const isApi = pathname.startsWith("/api")
  const isNextInternal = pathname.startsWith("/_next")
  const isStaticAsset = /\.[^\/]+$/.test(pathname) || pathname === "/favicon.ico"
  if (isApi || isNextInternal || isStaticAsset) {
    return NextResponse.next()
  }

  // Admin routes guard
  if (pathname.startsWith("/admin")) {
    // Allow login page
    if (pathname === "/admin/login") {
      return NextResponse.next()
    }

    const token = req.cookies.get("admin-token")?.value
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl.origin))
    }

    try {
      await jwtVerify(token, ADMIN_JWT_SECRET)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL("/admin/login", nextUrl.origin))
    }
  }

  // Host-based routing: alex.advlink.site → rewrite to /adv/alex (URL stays on subdomain)
  // Must run BEFORE auth gate so public profiles are never blocked
  const host = req.headers.get("host") || ""
  const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "advlink.site"
  const suffix = `.${ROOT_DOMAIN}`

  if (host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    const isApex = subdomain.length === 0
    if (!isApex && !RESERVED_SLUGS.has(subdomain)) {
      if (pathname === "/") {
        const url = nextUrl.clone()
        url.pathname = `/adv/${subdomain}`
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
      signInUrl.searchParams.set("callbackUrl", nextUrl.href)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Run on all paths except Next internals and common static files
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}


