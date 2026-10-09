import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { authOptions } from "@/auth"
import {
  RATE_LIMIT_MESSAGE,
  checkAll,
  getClientIp,
  rateLimitResponse,
  rateLimiters,
  type RateLimitResult,
} from "@/lib/rate-limit"

type RouteContext = { params: Promise<{ nextauth: string[] }> }

const handler = NextAuth(authOptions)

async function readEmail(req: NextRequest): Promise<string> {
  // Read from a clone: NextAuth parses the original body itself.
  const contentType = req.headers.get("content-type") || ""
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return String(new URLSearchParams(await req.clone().text()).get("email") ?? "")
        .trim()
        .toLowerCase()
    }
    if (contentType.includes("application/json")) {
      const body = (await req.clone().json()) as { email?: unknown }
      return String(body?.email ?? "").trim().toLowerCase()
    }
  } catch {
    // Malformed body: NextAuth will reject it; rate limit by IP only.
  }
  return ""
}

function tooManyRequests(req: NextRequest, result: RateLimitResult) {
  // next-auth/react `signIn(..., { redirect: false })` reads `url` and extracts `?error=` from it,
  // so the client receives `{ error: "TooManyRequests", status: 429 }` instead of crashing.
  const url = new URL("/login", req.nextUrl.origin)
  url.searchParams.set("error", "TooManyRequests")
  return rateLimitResponse(result, { error: RATE_LIMIT_MESSAGE, url: url.toString() })
}

/**
 * Rate limits the endpoints that can be abused without a session:
 * - POST /api/auth/signin/email       → magic link (email bombing): per recipient + per IP
 * - POST /api/auth/callback/credentials → password brute force: per IP+email + per IP
 */
async function POST(req: NextRequest, ctx: RouteContext) {
  const [action, provider] = (await ctx.params).nextauth ?? []
  const ip = getClientIp(req.headers)

  if (action === "signin" && provider === "email") {
    const email = await readEmail(req)
    const checks: Array<[typeof rateLimiters.magicLinkByIp, string]> = [[rateLimiters.magicLinkByIp, ip]]
    if (email) checks.push([rateLimiters.magicLinkByEmail, email])
    const blocked = checkAll(checks)
    if (blocked) return tooManyRequests(req, blocked)
  } else if (action === "callback" && provider === "credentials") {
    const email = await readEmail(req)
    const blocked = checkAll([
      [rateLimiters.credentialsByIpEmail, `${ip}|${email}`],
      [rateLimiters.credentialsByIp, ip],
    ])
    if (blocked) return tooManyRequests(req, blocked)
  }

  return handler(req, ctx)
}

export { handler as GET, POST }
