import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getSafeCallbackUrl } from "@/lib/safe-callback"

describe("getSafeCallbackUrl()", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site"))
  afterEach(() => vi.unstubAllEnvs())

  it("falls back to the editor when missing", () => {
    expect(getSafeCallbackUrl(undefined)).toBe("/profile/edit")
    expect(getSafeCallbackUrl("")).toBe("/profile/edit")
    expect(getSafeCallbackUrl(["/a", "/b"])).toBe("/profile/edit")
  })

  it("keeps same-origin relative paths", () => {
    expect(getSafeCallbackUrl("/profile/tickets/abc?x=1")).toBe("/profile/tickets/abc?x=1")
  })

  it("converts same-origin absolute URLs (as the proxy builds them) to paths", () => {
    expect(getSafeCallbackUrl("https://app.advlink.site/profile/tickets/abc")).toBe("/profile/tickets/abc")
  })

  it("rejects other origins and protocol-relative tricks", () => {
    expect(getSafeCallbackUrl("https://evil.com/profile")).toBe("/profile/edit")
    expect(getSafeCallbackUrl("https://joao.advlink.site/")).toBe("/profile/edit")
    expect(getSafeCallbackUrl("//evil.com")).toBe("/profile/edit")
    expect(getSafeCallbackUrl("/\\evil.com")).toBe("/profile/edit")
    expect(getSafeCallbackUrl("javascript:alert(1)")).toBe("/profile/edit")
  })
})
