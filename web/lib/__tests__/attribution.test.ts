import { describe, it, expect } from "vitest"
import { attributionFromRequest, parseAttributionCookie } from "@/lib/attribution"

const now = new Date("2026-10-09T12:00:00Z")

describe("attributionFromRequest()", () => {
  it("captures UTM params and the landing path", () => {
    const url = new URL("https://app.advlink.site/login?utm_source=blog&utm_medium=footer&x=1")
    expect(attributionFromRequest(url, null, now)).toEqual({
      utm_source: "blog",
      utm_medium: "footer",
      landingPath: "/login",
      firstSeenAt: now.toISOString(),
    })
  })

  it("captures external referrers without query strings", () => {
    const url = new URL("https://app.advlink.site/login")
    expect(attributionFromRequest(url, "https://www.google.com/search?q=advogado", now)).toMatchObject({
      referrer: "https://www.google.com/search",
    })
  })

  it("ignores internal navigation and requests without signals", () => {
    const url = new URL("https://app.advlink.site/profile/edit")
    expect(attributionFromRequest(url, "https://app.advlink.site/login", now)).toBeNull()
    expect(attributionFromRequest(url, null, now)).toBeNull()
  })

  it("truncates long values", () => {
    const url = new URL(`https://app.advlink.site/?utm_campaign=${"a".repeat(500)}`)
    expect(attributionFromRequest(url, null, now)?.utm_campaign).toHaveLength(200)
  })
})

describe("parseAttributionCookie()", () => {
  it("parses valid JSON objects and drops non-string values", () => {
    expect(parseAttributionCookie('{"utm_source":"blog","n":1}')).toEqual({ utm_source: "blog" })
  })

  it("returns null for missing or malformed values", () => {
    expect(parseAttributionCookie(undefined)).toBeNull()
    expect(parseAttributionCookie("not-json")).toBeNull()
    expect(parseAttributionCookie("[1]")).toBeNull()
  })
})
