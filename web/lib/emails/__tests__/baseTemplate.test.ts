import { describe, it, expect } from "vitest"
import { emailTemplate } from "@/lib/emails/baseTemplate"

describe("emailTemplate", () => {
  it("renders title in the HTML", () => {
    const html = emailTemplate({ title: "Test Title", body: "<p>Body</p>" })
    expect(html).toContain("Test Title")
    expect(html).toContain("<p>Body</p>")
  })

  it("includes preheader when provided", () => {
    const html = emailTemplate({ title: "T", body: "B", preheader: "Preview text" })
    expect(html).toContain("Preview text")
    expect(html).toContain("display:none")
  })

  it("does not include preheader when not provided", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).not.toContain("display:none;font-size:1px")
  })

  it("includes CTA button when provided", () => {
    const html = emailTemplate({ title: "T", body: "B", cta: { label: "Click Me", url: "https://example.com" } })
    expect(html).toContain("Click Me")
    expect(html).toContain("https://example.com")
  })

  it("does not include CTA when not provided", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).not.toContain("border-radius:6px;background:#0a2463")
  })

  it("includes AdvLink branding", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain("AdvLink")
    expect(html).toContain("advlink-logo-primary.png")
  })

  it("renders valid HTML document", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain("</html>")
  })
})
