import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { OabWarnings } from "../oab-warnings"

describe("OabWarnings", () => {
  it("não renderiza sem achados", () => {
    const { container } = render(<OabWarnings text="Atuação em Direito Civil" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("não renderiza com texto indefinido", () => {
    const { container } = render(<OabWarnings text={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("lista achados com role status e rodapé", () => {
    render(<OabWarnings text="Advogado especialista, consulta gratuita" />)
    const box = screen.getByRole("status")
    expect(box).toHaveTextContent("especialista")
    expect(box).toHaveTextContent("art. 3º, III")
    expect(box).toHaveTextContent("gratuita")
    expect(box).toHaveTextContent("Não substitui a análise da seccional da OAB")
  })
})
