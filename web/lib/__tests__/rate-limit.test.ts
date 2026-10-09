// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  RATE_LIMIT_MESSAGE,
  checkAll,
  createRateLimiter,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"

function clock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe("createRateLimiter", () => {
  it("allows up to `limit` hits per window, then blocks with retryAfter", () => {
    const c = clock()
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now: c.now })
    expect(rl.check("k").remaining).toBe(2)
    expect(rl.check("k").remaining).toBe(1)
    expect(rl.check("k")).toMatchObject({ ok: true, remaining: 0 })
    c.advance(15_000)
    expect(rl.check("k")).toEqual({ ok: false, limit: 3, remaining: 0, retryAfterSec: 45 })
  })

  it("keeps keys independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(rl.check("a").ok).toBe(true)
    expect(rl.check("a").ok).toBe(false)
    expect(rl.check("b").ok).toBe(true)
  })

  it("starts a new window after windowMs", () => {
    const c = clock()
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now: c.now })
    rl.check("k")
    expect(rl.check("k").ok).toBe(false)
    c.advance(60_000)
    expect(rl.check("k").ok).toBe(true)
  })

  it("reset() clears a single key", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 })
    rl.check("k")
    rl.reset("k")
    expect(rl.check("k").ok).toBe(true)
  })

  it("clear() drops every key", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 })
    rl.check("a")
    rl.check("b")
    rl.clear()
    expect(rl.check("a").ok).toBe(true)
    expect(rl.check("b").ok).toBe(true)
  })

  it("survives a flood of unique keys (bounded memory)", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 })
    for (let i = 0; i < 12_000; i++) rl.check(`k${i}`)
    // The most recent key is still tracked.
    expect(rl.check("k11999").ok).toBe(false)
  })
})

describe("checkAll", () => {
  it("returns null when every limiter passes", () => {
    const a = createRateLimiter({ limit: 2, windowMs: 60_000 })
    const b = createRateLimiter({ limit: 2, windowMs: 60_000 })
    expect(checkAll([[a, "x"], [b, "y"]])).toBeNull()
  })

  it("returns the blocking result and still counts every limiter", () => {
    const a = createRateLimiter({ limit: 1, windowMs: 60_000 })
    const b = createRateLimiter({ limit: 5, windowMs: 60_000 })
    checkAll([[a, "x"], [b, "y"]])
    const blocked = checkAll([[a, "x"], [b, "y"]])
    expect(blocked?.ok).toBe(false)
    expect(b.check("y").remaining).toBe(2)
  })
})

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("9.9.9.9")
  })

  it("uses the last x-forwarded-for hop (appended by our proxy), not the spoofable first one", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }))).toBe("2.2.2.2")
  })

  it("falls back to 'unknown'", () => {
    expect(getClientIp(new Headers())).toBe("unknown")
  })
})

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After and pt-BR message", async () => {
    const res = rateLimitResponse({ ok: false, limit: 5, remaining: 0, retryAfterSec: 42 })
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(await res.json()).toEqual({ error: RATE_LIMIT_MESSAGE })
  })
})
