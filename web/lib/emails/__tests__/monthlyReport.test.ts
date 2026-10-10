import { describe, it, expect } from "vitest"
import { buildMonthlyReportEmail, compareVisits } from "../monthlyReport"
import type { SiteSummary } from "@/lib/analytics/summary"

const summary = (over: Partial<SiteSummary> = {}): SiteSummary => ({
  visits: 120,
  visitors: 80,
  contactClicks: { total: 9, byKind: { whatsapp: 7, phone: 0, email: 2, link: 0, form: 0 } },
  topCities: [{ city: "São Paulo", region: "SP", count: 50 }],
  topSources: [{ source: "Google", count: 70 }],
  ...over,
})
const ctx = (over = {}) => ({
  name: "Ana Souza",
  siteName: "Ana Souza Advocacia",
  siteUrl: "https://ana.advlink.site",
  monthName: "setembro",
  previousMonthName: "agosto",
  summary: summary(),
  previousVisits: 100,
  analyticsUrl: "https://app.advlink.site/profile/analytics",
  shareKitUrl: "https://app.advlink.site/profile/divulgar",
  unsubscribeUrl: "https://app.advlink.site/api/emails/unsubscribe?t=x",
  ...over,
})

describe("buildMonthlyReportEmail", () => {
  it("lists contact-form messages with the formulário label", () => {
    const { html } = buildMonthlyReportEmail(
      ctx({ summary: summary({ contactClicks: { total: 3, byKind: { whatsapp: 0, phone: 0, email: 0, link: 0, form: 3 } } }) }),
    )
    expect(html).toContain("formulário: 3")
  })

  it("builds subject and main content", () => {
    const { subject, html } = buildMonthlyReportEmail(ctx())
    expect(subject).toBe("Seu site em setembro: 120 visitas")
    expect(html).toContain("Olá, Ana!")
    expect(html).toContain("20% a mais que em agosto")
    expect(html).toContain("WhatsApp: 7")
    expect(html).toContain("e-mail: 2")
    expect(html).not.toContain("telefone: ")
    expect(html).toContain("São Paulo/SP: 50")
    expect(html).toContain("Google: 70")
    expect(html).toContain("Ver relatório completo")
    expect(html).toContain("https://app.advlink.site/profile/analytics")
    expect(html).toContain("/profile/divulgar")
    expect(html).toContain("Descadastrar")
  })

  it("singular subject and no comparison without baseline", () => {
    const { subject, html } = buildMonthlyReportEmail(ctx({ summary: summary({ visits: 1 }), previousVisits: 0 }))
    expect(subject).toBe("Seu site em setembro: 1 visita")
    expect(html).not.toContain("que em agosto")
  })

  it("omits contacts section when none and escapes dynamic text", () => {
    const { html } = buildMonthlyReportEmail(
      ctx({
        siteName: "<script>x</script>",
        name: "<b>Evil</b>",
        summary: summary({
          contactClicks: { total: 0, byKind: { whatsapp: 0, phone: 0, email: 0, link: 0, form: 0 } },
          topSources: [{ source: "<img src=x>", count: 1 }],
        }),
      }),
    )
    expect(html).not.toContain("Cliques em contato")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img src=x>")
    expect(html).not.toContain("<b>Evil")
  })

  it("compareVisits phrases", () => {
    expect(compareVisits(50, 100, "agosto")).toBe("50% a menos que em agosto.")
    expect(compareVisits(100, 100, "agosto")).toBe("Mesma quantidade de agosto.")
    expect(compareVisits(10, 0, "agosto")).toBeNull()
  })
})
