import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/app/adv/[slug]/TeamCarousel", () => ({ TeamCarousel: () => null }))
vi.mock("@/app/adv/[slug]/AreasCarousel", () => ({ AreasCarousel: () => null }))

import Theme02 from "../02/Theme02"
import Theme03 from "../03/Theme03"
import Theme04 from "../04/Theme04"

beforeAll(() => {
  // framer-motion whileInView needs IntersectionObserver (not in jsdom)
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", IO)
})

const base = { primary: "#112233", text: "#ffffff", secondary: "#eeeeee" }
const areaWithFaq = { id: "a1", title: "Família", description: null, faqs: [{ id: "f1", question: "Quanto tempo leva?", answer: "Depende do caso.", position: 0 }] }

describe.each([
  ["Theme02", Theme02],
  ["Theme03", Theme03],
  ["Theme04", Theme04],
])("%s growth fields", (_name, Theme) => {
  it("renders LinkedIn, Facebook and YouTube buttons only when set", () => {
    const { unmount } = render(
      <Theme {...base} areas={[]} profile={{ publicName: "Ana", linkedinUrl: "https://linkedin.com/in/ana", facebookUrl: "https://facebook.com/ana", youtubeUrl: "https://youtube.com/@ana" }} />
    )
    for (const [name, href] of [["LinkedIn", "https://linkedin.com/in/ana"], ["Facebook", "https://facebook.com/ana"], ["YouTube", "https://youtube.com/@ana"]]) {
      const a = screen.getByRole("link", { name })
      expect(a).toHaveAttribute("href", href)
      expect(a).toHaveAttribute("target", "_blank")
      expect(a).toHaveAttribute("rel", "noopener noreferrer")
    }
    unmount()
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana" }} />)
    expect(screen.queryByRole("link", { name: "LinkedIn" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Facebook" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument()
  })

  it("shows the service line with only the filled parts", () => {
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", officeHours: "Seg a sex, 9h às 18h", onlineService: true, languages: "Português, Inglês" }} />)
    expect(screen.getByText("Seg a sex, 9h às 18h · Atendimento on-line · Idiomas: Português, Inglês")).toBeInTheDocument()
  })

  it("shows a partial service line and hides it when empty", () => {
    const { unmount } = render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", onlineService: true }} />)
    expect(screen.getByText("Atendimento on-line")).toBeInTheDocument()
    unmount()
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", onlineService: false }} />)
    expect(screen.queryByText(/Atendimento on-line|Idiomas/)).not.toBeInTheDocument()
  })

  it("shows the law firm identification in the footer", () => {
    render(
      <Theme
        {...base}
        areas={[]}
        profile={{ publicName: "Ana", firmName: "Silva & Souza", firmType: "sociedade", firmOabRegistration: "1234", firmCnpj: "11222333000181" }}
      />
    )
    expect(screen.getByText("Silva & Souza · Sociedade de Advogados · Registro OAB nº 1234 · CNPJ 11.222.333/0001-81")).toBeInTheDocument()
  })

  it("uses the individual firm label and omits empty parts; hidden without firmName", () => {
    const { unmount } = render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", firmName: "Ana Advocacia", firmType: "individual" }} />)
    expect(screen.getByText("Ana Advocacia · Sociedade Individual de Advocacia")).toBeInTheDocument()
    unmount()
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", firmType: "individual", firmCnpj: "11222333000181" }} />)
    expect(screen.queryByText(/CNPJ|Sociedade/)).not.toBeInTheDocument()
  })

  it("builds the site WhatsApp links with the pre-filled message (hero and floating)", () => {
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", whatsapp: "(11) 99999-0000", whatsappMessage: "Olá, vim pelo site", whatsappIsFixed: true }} />)
    const expected = "https://wa.me/11999990000?text=" + encodeURIComponent("Olá, vim pelo site")
    const links = document.querySelectorAll('a[href^="https://wa.me/"]')
    expect(links).toHaveLength(2)
    links.forEach((l) => expect(l).toHaveAttribute("href", expected))
  })

  it("keeps a plain wa.me link without message", () => {
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana", whatsapp: "11999990000" }} />)
    expect(document.querySelector('a[href^="https://wa.me/"]')).toHaveAttribute("href", "https://wa.me/11999990000")
  })

  it("renders the FAQ section with the (renamed) title when areas have FAQs", () => {
    const { unmount } = render(<Theme {...base} areas={[areaWithFaq]} profile={{ publicName: "Ana" }} sectionLabels={{ faq: "Dúvidas comuns" }} />)
    expect(screen.getByRole("heading", { level: 2, name: /Dúvidas comuns/ })).toBeInTheDocument()
    expect(screen.getByText("Quanto tempo leva?")).toBeInTheDocument()
    unmount()
    render(<Theme {...base} areas={[areaWithFaq]} profile={{ publicName: "Ana" }} sectionTitleHidden={{ faq: true, servicos: true }} />)
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
    expect(screen.getByText("Quanto tempo leva?")).toBeInTheDocument()
  })

  it("renders no FAQ section (nor header) without FAQs", () => {
    render(<Theme {...base} areas={[{ id: "a1", title: "Família", description: null, faqs: [] }]} profile={{ publicName: "Ana" }} />)
    expect(screen.queryByText("Perguntas frequentes")).not.toBeInTheDocument()
  })
})

describe.each([
  ["Theme02", Theme02],
  ["Theme03", Theme03],
  ["Theme04", Theme04],
])("%s articles and lead form sections", (_name, Theme) => {
  const articles = [{ id: "a1", slug: "meu-artigo", title: "Meu artigo", excerpt: "Resumo", publishedAt: "2026-03-05T12:00:00.000Z" }]

  it("renders the articles section with links, and hides it without articles", () => {
    const { unmount } = render(<Theme {...base} areas={[]} profile={{ publicName: "Ana" }} articles={articles} siteBaseUrl="https://ana.advlink.site/" />)
    expect(screen.getByText("Artigos")).toBeInTheDocument()
    expect(screen.getByText("Meu artigo").closest("a")).toHaveAttribute("href", "https://ana.advlink.site/artigos/meu-artigo")
    unmount()
    render(<Theme {...base} areas={[]} profile={{ publicName: "Ana" }} />)
    expect(screen.queryByText("Artigos")).not.toBeInTheDocument()
  })

  it("renders the lead form only when enabled and disables it on previews", () => {
    const { unmount } = render(<Theme {...base} areas={[areaWithFaq]} slug="ana" leadFormDisabled profile={{ publicName: "Ana", leadFormEnabled: true }} />)
    expect(screen.getByText("Fale com o escritório")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled()
    unmount()
    render(<Theme {...base} areas={[]} slug="ana" profile={{ publicName: "Ana", leadFormEnabled: false }} />)
    expect(screen.queryByText("Fale com o escritório")).not.toBeInTheDocument()
  })
})
