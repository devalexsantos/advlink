import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import FaqSection, { hasFaqs } from "../FaqSection"

const faq = (id: string, q: string, a: string, position = 0) => ({ id, question: q, answer: a, position })

describe("FaqSection", () => {
  it("renders nothing without FAQs", () => {
    const { container } = render(<FaqSection areas={[{ id: "a", title: "Família", faqs: [] }, { id: "b", title: "Civil" }]} text="#fff" borderColor="#000" />)
    expect(container).toBeEmptyDOMElement()
    expect(hasFaqs([{ id: "a", title: "x", faqs: [] }])).toBe(false)
  })

  it("renders native details with question and multi-line answer, ordered by position", () => {
    const { container } = render(
      <FaqSection
        areas={[{ id: "a", title: "Família", faqs: [faq("2", "Segunda?", "R2", 1), faq("1", "Primeira?", "Linha 1\nLinha 2", 0)] }]}
        text="#fff"
        borderColor="#000"
      />
    )
    const details = container.querySelectorAll("details")
    expect(details).toHaveLength(2)
    expect(details[0].querySelector("summary")).toHaveTextContent("Primeira?")
    expect(screen.getByText(/Linha 1/).className).toContain("whitespace-pre-line")
    // single area: no area heading
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument()
  })

  it("groups by area title when more than one area has FAQs", () => {
    render(
      <FaqSection
        areas={[
          { id: "a", title: "Família", faqs: [faq("1", "Q1", "A1")] },
          { id: "b", title: "Civil", faqs: [faq("2", "Q2", "A2")] },
          { id: "c", title: "Vazia", faqs: [] },
        ]}
        text="#fff"
        borderColor="#000"
      />
    )
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Família", "Civil"])
  })
})
