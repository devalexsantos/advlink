import { describe, it, expect } from "vitest"
import { buildActivationEmail, type ActivationEmailKind } from "../activationEmails"
import { emailTemplate } from "../baseTemplate"

const ctx = {
  name: "Maria Souza",
  appUrl: "https://app.advlink.site",
  siteUrl: "https://maria.advlink.site/",
  unsubscribeUrl: "https://app.advlink.site/api/emails/unsubscribe?token=abc",
}

const expected: Record<ActivationEmailKind, string> = {
  welcome: "/profile/edit",
  checklist: "/profile/edit",
  oab_tips: "/profile/edit",
  last_reminder: "/profile/edit",
  share_kit: "/profile/divulgar",
}

describe("activation e-mails", () => {
  for (const kind of Object.keys(expected) as ActivationEmailKind[]) {
    it(`${kind}: subject, CTA, preheader and unsubscribe`, () => {
      const { subject, html } = buildActivationEmail(kind, ctx)
      expect(subject.length).toBeGreaterThan(10)
      expect(html).toContain(`href="https://app.advlink.site${expected[kind]}"`)
      expect(html).toContain("Olá, Maria!")
      expect(html).toContain("display:none")
      expect(html).toContain(ctx.unsubscribeUrl)
      expect(html).toContain("Descadastrar")
    })
  }

  it("escapes the name", () => {
    const { html } = buildActivationEmail("welcome", { ...ctx, name: '<script>alert(1)</script> "x"' })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("falls back to a generic greeting without name", () => {
    expect(buildActivationEmail("welcome", { ...ctx, name: null }).html).toContain("Olá!")
  })

  it("welcome mentions checklist and preview sharing", () => {
    const { html } = buildActivationEmail("welcome", ctx)
    expect(html).toContain("checklist")
    expect(html).toContain("Compartilhar prévia")
  })

  it("oab_tips never claims OAB approval", () => {
    const { html } = buildActivationEmail("oab_tips", ctx)
    expect(html).toContain("Provimento 205/2021")
    expect(html).not.toMatch(/aprovad[oa] pela OAB/i)
  })

  it("last_reminder mentions the 7-day guarantee", () => {
    expect(buildActivationEmail("last_reminder", ctx).html).toContain("7 dias de garantia")
  })

  it("share_kit shows the site url", () => {
    expect(buildActivationEmail("share_kit", ctx).html).toContain("https://maria.advlink.site/")
  })

  it("base template omits the unsubscribe link by default", () => {
    expect(emailTemplate({ title: "t", body: "b" })).not.toContain("Descadastrar")
  })
})
