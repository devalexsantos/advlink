import { describe, it, expect } from "vitest"
import { emailTemplate } from "@/lib/emails/baseTemplate"

describe("emailTemplate", () => {
  it("renders title in the HTML", () => {
    const html = emailTemplate({ title: "Test Title", body: "<p>Body</p>" })
    expect(html).toContain("Test Title")
    expect(html).toContain("<p>Body</p>")
  })

  it("includes preheader with zwnj padding when provided", () => {
    const html = emailTemplate({ title: "T", body: "B", preheader: "Preview text" })
    expect(html).toContain("Preview text")
    expect(html).toContain("mso-hide:all")
    expect(html).toContain("&zwnj;&nbsp;")
  })

  it("does not include preheader when not provided", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).not.toContain("mso-hide:all")
  })

  it("includes CTA button with VML fallback when provided", () => {
    const html = emailTemplate({ title: "T", body: "B", cta: { label: "Click Me", url: "https://example.com" } })
    expect(html).toContain("Click Me")
    expect(html).toContain("https://example.com")
    expect(html).toContain("v:roundrect")
    expect(html).toContain("<!--[if mso]>")
    expect(html).toContain("<!--[if !mso]><!-->")
  })

  it("does not include CTA when not provided", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).not.toContain("v:roundrect")
    expect(html).not.toContain("<!--[if !mso]><!-->")
  })

  it("renders logo at 50x50px", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain('width="50"')
    expect(html).toContain('height="50"')
    expect(html).toContain("width:50px;height:50px")
  })

  it("includes AdvLink branding", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain("AdvLink")
    expect(html).toContain("advlink-logo-primary.png")
  })

  it("renders valid HTML document with Outlook meta tags", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain("</html>")
    expect(html).toContain("xmlns:v")
    expect(html).toContain("xmlns:o")
    expect(html).toContain("x-apple-disable-message-reformatting")
    expect(html).toContain('content="telephone=no,address=no,email=no,date=no,url=no"')
    expect(html).toContain("AllowPNG")
    expect(html).toContain("PixelsPerInch")
  })

  it("renders footerNote when provided", () => {
    const html = emailTemplate({ title: "T", body: "B", footerNote: "Copie este link" })
    expect(html).toContain("Copie este link")
  })

  it("does not render footerNote when not provided", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    // footerNote td has specific padding
    const footerNoteTdCount = (html.match(/padding:16px 0 0 0/g) || []).length
    expect(footerNoteTdCount).toBe(0)
  })

  it("includes transparency line in footer", () => {
    const html = emailTemplate({ title: "T", body: "B" })
    expect(html).toContain("enviado por AdvLink")
    expect(html).toContain("ignore esta mensagem")
  })
})
