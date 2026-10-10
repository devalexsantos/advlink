import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ArticlesSection from "../ArticlesSection"

const mk = (n: number) => ({ id: `a${n}`, slug: `art-${n}`, title: `Artigo ${n}`, excerpt: `Resumo ${n}`, coverImageUrl: n === 1 ? "https://img/x.jpg" : null, publishedAt: "2026-03-05T12:00:00.000Z" })
const base = { text: "#fff", borderColor: "#ccc" }

describe("ArticlesSection", () => {
  it("renders nothing without articles", () => {
    const { container } = render(<ArticlesSection {...base} articles={[]} baseUrl="https://a.advlink.site/" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders up to 3 cards with links, date and list link", () => {
    render(<ArticlesSection {...base} articles={[1, 2, 3, 4].map(mk)} baseUrl="https://a.advlink.site/" />)
    expect(screen.queryByText("Artigo 4")).not.toBeInTheDocument()
    expect(screen.getByText("Artigo 1").closest("a")).toHaveAttribute("href", "https://a.advlink.site/artigos/art-1")
    expect(screen.getAllByText(/março de 2026/).length).toBe(3)
    expect(screen.getByRole("link", { name: "Ver todos os artigos" })).toHaveAttribute("href", "https://a.advlink.site/artigos")
  })

  it("disables links without a base URL", () => {
    render(<ArticlesSection {...base} articles={[mk(1)]} />)
    expect(screen.getByText("Artigo 1")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
