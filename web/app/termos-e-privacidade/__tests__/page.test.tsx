// @vitest-environment node
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

import Page from "../page"

describe("Termos de Uso e Política de Privacidade", () => {
  const html = renderToStaticMarkup(<Page />)

  it("states monthly or annual plans with automatic renewal", () => {
    expect(html).toContain("O plano pode ser mensal ou anual, com renovação automática ao fim de cada período")
  })

  it("covers contact-form messages in the operator clause (consent, 90 days)", () => {
    expect(html).toContain("formulário de contato")
    expect(html).toContain("consentimento do visitante")
    expect(html).toContain("excluídas automaticamente")
    expect(html).toContain("90 dias")
  })
})
