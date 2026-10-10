import { describe, it, expect } from "vitest"
import { shouldLoadPixel } from "@/components/MetaPixel"

describe("shouldLoadPixel", () => {
  const root = "advlink.site"

  it("loads on the app host funnel pages", () => {
    expect(shouldLoadPixel("app.advlink.site", "/login", root)).toBe(true)
    expect(shouldLoadPixel("app.advlink.site", "/onboarding/profile", root)).toBe(true)
    expect(shouldLoadPixel("app.advlink.site", "/profile/edit", root)).toBe(true)
  })

  it("never loads on a lawyer's public site", () => {
    expect(shouldLoadPixel("joao.advlink.site", "/", root)).toBe(false)
    expect(shouldLoadPixel("app.advlink.site", "/adv/joao", root)).toBe(false)
  })

  it("never loads on shared site previews", () => {
    expect(shouldLoadPixel("app.advlink.site", "/previa/abc123", root)).toBe(false)
  })

  it("never loads on the admin", () => {
    expect(shouldLoadPixel("app.advlink.site", "/admin/users", root)).toBe(false)
  })

  it("handles local roots with a port", () => {
    expect(shouldLoadPixel("joao.localhost", "/", "localhost:3000")).toBe(false)
    expect(shouldLoadPixel("localhost", "/login", "localhost:3000")).toBe(true)
  })
})
