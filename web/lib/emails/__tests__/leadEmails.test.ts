import { describe, it, expect } from "vitest"
import { buildLeadEmail } from "../leadEmails"

const ctx = (over = {}) => ({
  siteName: "Ana Souza Advocacia",
  name: "Maria",
  email: "maria@example.com",
  phone: "(11) 99999-0000",
  areaTitle: "Direito do Trabalho",
  message: "Linha 1\nLinha 2",
  inboxUrl: "https://app.advlink.site/profile/contatos",
  retentionDays: 90,
  ...over,
})

describe("buildLeadEmail", () => {
  it("builds subject, fields, CTA and retention note", () => {
    const { subject, html } = buildLeadEmail(ctx())
    expect(subject).toBe("Nova mensagem pelo seu site")
    expect(html).toContain("Ana Souza Advocacia")
    expect(html).toContain("mailto:maria@example.com")
    expect(html).toContain("(11) 99999-0000")
    expect(html).toContain("Direito do Trabalho")
    expect(html).toContain("Linha 1<br>Linha 2")
    expect(html).toContain('href="https://app.advlink.site/profile/contatos"')
    expect(html).toContain("90 dias")
  })

  it("escapes every visitor-supplied value", () => {
    const evil = `<img src=x onerror=alert(1)>"'&`
    const { html } = buildLeadEmail(
      ctx({ name: evil, email: `a@b.co"><script>`, phone: evil, areaTitle: evil, message: evil, siteName: evil }),
    )
    expect(html).not.toContain("<img src=x")
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;")
  })

  it("omits optional fields when absent", () => {
    const { html } = buildLeadEmail(ctx({ email: null, areaTitle: null }))
    expect(html).not.toContain("mailto:")
    expect(html).not.toContain("Assunto:")
    expect(html).not.toContain("Responder a este e-mail")
  })
})
