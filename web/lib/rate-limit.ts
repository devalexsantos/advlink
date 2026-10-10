import { NextResponse } from "next/server"

/**
 * Minimal fixed-window rate limiter kept in process memory.
 *
 * PER-INSTANCE: counters live in this Node process only. That is fine while the app runs as a
 * single container on the VPS (Easypanel); counters reset on restart/deploy. If the app is ever
 * scaled horizontally, move the store to Postgres/Redis — the `check()` contract stays the same.
 */

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  /** Seconds until the current window resets (>= 1 when blocked). */
  retryAfterSec: number
}

export type RateLimiter = {
  check(key: string): RateLimitResult
  reset(key: string): void
  /** Test helper: drop every counter. */
  clear(): void
}

type Entry = { count: number; resetAt: number }

const MAX_KEYS = 10_000

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const { limit, windowMs } = opts
  const now = opts.now ?? Date.now
  const store = new Map<string, Entry>()
  let lastSweep = now()

  function sweep(t: number) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= t) store.delete(key)
    }
    lastSweep = t
    // Still too big (e.g. a flood of unique keys inside one window): evict oldest inserted keys.
    if (store.size > MAX_KEYS) {
      let excess = store.size - MAX_KEYS
      for (const key of store.keys()) {
        if (excess-- <= 0) break
        store.delete(key)
      }
    }
  }

  return {
    check(key) {
      const t = now()
      // Periodic cleanup, done lazily so no timer keeps the process (or tests) alive.
      if (t - lastSweep >= windowMs || store.size > MAX_KEYS) sweep(t)

      let entry = store.get(key)
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + windowMs }
        store.set(key, entry)
      }
      entry.count++
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - t) / 1000))
      if (entry.count > limit) {
        return { ok: false, limit, remaining: 0, retryAfterSec }
      }
      return { ok: true, limit, remaining: limit - entry.count, retryAfterSec }
    },
    reset(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

// Limiters are memoised on globalThis so every route bundle (and dev HMR reloads) share the same
// counters within the process.
const registry: Map<string, RateLimiter> = ((globalThis as { __advlinkRateLimiters?: Map<string, RateLimiter> })
  .__advlinkRateLimiters ??= new Map())

function named(name: string, limit: number, windowMs: number): RateLimiter {
  let limiter = registry.get(name)
  if (!limiter) {
    limiter = createRateLimiter({ limit, windowMs })
    registry.set(name, limiter)
  }
  return limiter
}

/** Test helper: reset every named limiter. */
export function resetRateLimiters() {
  for (const limiter of registry.values()) limiter.clear()
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Limits applied across the app. Keys are documented next to each call site. */
export const rateLimiters = {
  /** Admin panel login: per IP+email (brute force on one account) and per IP (spraying). */
  adminLoginByIpEmail: named("admin-login:ip-email", 5, 15 * MINUTE),
  adminLoginByIp: named("admin-login:ip", 20, 15 * MINUTE),
  /** NextAuth credentials provider: same shape, slightly looser (real users mistype). */
  credentialsByIpEmail: named("credentials:ip-email", 10, 15 * MINUTE),
  credentialsByIp: named("credentials:ip", 30, 15 * MINUTE),
  /** Magic link: per recipient (email bombing) and per IP. */
  magicLinkByEmail: named("magic-link:email", 5, HOUR),
  magicLinkByIp: named("magic-link:ip", 20, HOUR),
  /** OpenAI: single area description in the editor, per user. */
  aiDescriptionByUser: named("ai-description:user", 30, HOUR),
  /** OpenAI: onboarding submission (up to MAX_ONBOARDING_AREAS descriptions per call), per user. */
  onboardingByUser: named("onboarding:user", 10, HOUR),
  /** Public page-view beacon: per IP+slug, so one client can't inflate a profile's analytics. */
  analyticsByIpSlug: named("analytics:ip-slug", 60, HOUR),
  /** Preview link generation (creates rows + product events), per user. */
  previewLinkByUser: named("preview-link:user", 20, HOUR),
}

/**
 * Client IP as seen by the trusted reverse proxy (Traefik on Easypanel). Prefers `x-real-ip`
 * (set by the proxy) and otherwise the LAST `x-forwarded-for` hop — the one appended by our proxy —
 * because the first hop is client-controlled and trivially spoofable.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return "unknown"
}

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente novamente."

/** Returns the first failing result, or null when every check passes. All checks are counted. */
export function checkAll(checks: Array<[RateLimiter, string]>): RateLimitResult | null {
  let blocked: RateLimitResult | null = null
  for (const [limiter, key] of checks) {
    const result = limiter.check(key)
    if (!result.ok && (!blocked || result.retryAfterSec > blocked.retryAfterSec)) blocked = result
  }
  return blocked
}

export function rateLimitResponse(
  result: RateLimitResult,
  body: Record<string, unknown> = { error: RATE_LIMIT_MESSAGE },
) {
  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSec),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": "0",
    },
  })
}
