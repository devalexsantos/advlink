import { describe, it, expect } from "vitest"
import { createSignInEmailHtml, createSignInEmailText } from "@/lib/emails/authEmail"

describe("authEmail", () => {
  describe("createSignInEmailHtml", () => {
    it("includes the sign-in URL", () => {
      const html = createSignInEmailHtml({ url: "https://app.advlink.site/api/auth/callback/email?token=abc" })
      expect(html).toContain("https://app.advlink.site/api/auth/callback/email?token=abc")
    })

    it("includes the CTA button label", () => {
      const html = createSignInEmailHtml({ url: "https://example.com" })
      expect(html).toContain("Entrar na plataforma")
    })

    it("includes instructional text", () => {
      const html = createSignInEmailHtml({ url: "https://example.com" })
      expect(html).toContain("link de acesso")
      expect(html).toContain("24 horas")
    })
  })

  describe("createSignInEmailText", () => {
    it("includes the URL in plain text", () => {
      const text = createSignInEmailText({ url: "https://example.com/login" })
      expect(text).toContain("https://example.com/login")
    })
  })
})
