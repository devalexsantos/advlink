import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  // Evita loop: se já estiver em /login, não redireciona
  if (!token && !req.nextUrl.pathname.startsWith("/login")) {
    const signInUrl = new URL("/login", req.nextUrl.origin)
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/onboarding/:path*", "/profile/edit/:path*"],
}


