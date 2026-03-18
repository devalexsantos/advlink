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

    it("includes footerNote with URL fallback", () => {
      const html = createSignInEmailHtml({ url: "https://example.com/login" })
      expect(html).toContain("copie e cole")
      expect(html).toContain("https://example.com/login")
    })
  })

  describe("createSignInEmailText", () => {
    it("includes the URL in plain text", () => {
      const text = createSignInEmailText({ url: "https://example.com/login" })
      expect(text).toContain("https://example.com/login")
    })

    it("includes subject and explanation", () => {
      const text = createSignInEmailText({ url: "https://example.com" })
      expect(text).toContain("Seu acesso")
      expect(text).toContain("link de acesso")
    })

    it("includes expiration info", () => {
      const text = createSignInEmailText({ url: "https://example.com" })
      expect(text).toContain("24 horas")
    })

    it("includes disclaimer", () => {
      const text = createSignInEmailText({ url: "https://example.com" })
      expect(text).toContain("ignore")
    })

    it("includes AdvLink signature", () => {
      const text = createSignInEmailText({ url: "https://example.com" })
      expect(text).toContain("AdvLink")
      expect(text).toContain("app.advlink.site")
    })
  })
})
