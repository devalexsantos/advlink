import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import LeadFormSection from "../LeadFormSection"

const props = { slug: "ana", areas: ["Família", "Trabalhista"], privacyUrl: "https://ana.advlink.site/privacidade", text: "#fff", borderColor: "#ccc", buttonBg: "#eee", buttonText: "#111" }
const fetchMock = vi.fn()

function fill(over: Record<string, string> = {}) {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: over.name ?? "Maria" } })
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: over.email ?? "m@x.com" } })
  fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: over.message ?? "Gostaria de um retorno." } })
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
})
afterEach(() => vi.restoreAllMocks())

describe("LeadFormSection", () => {
  it("shows notice, honeypot, consent link and area options", () => {
    const { container } = render(<LeadFormSection {...props} />)
    expect(screen.getByText(/Não envie documentos nem detalhes sensíveis/)).toBeInTheDocument()
    const hp = container.querySelector('input[name="website"]') as HTMLInputElement
    expect(hp).toBeTruthy()
    expect(hp.tabIndex).toBe(-1)
    expect(hp.closest("[aria-hidden='true']")).not.toBeNull()
    expect(screen.getByRole("link", { name: "aviso de privacidade" })).toHaveAttribute("target", "_blank")
    expect(screen.getByRole("option", { name: "Trabalhista" })).toBeInTheDocument()
  })

  it("requires name, e-mail or phone, message and consent", () => {
    render(<LeadFormSection {...props} />)
    submit()
    expect(screen.getByRole("alert")).toHaveTextContent("Informe seu nome")
    fill({ email: "" })
    submit()
    expect(screen.getByRole("alert")).toHaveTextContent("e-mail ou um telefone")
    fireEvent.change(screen.getByLabelText("Telefone/WhatsApp"), { target: { value: "11999999999" } })
    submit()
    expect(screen.getByRole("alert")).toHaveTextContent("concordar")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts the payload with startedAt and shows success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ ok: true }) })
    render(<LeadFormSection {...props} />)
    fill()
    fireEvent.change(screen.getByLabelText("Área (opcional)"), { target: { value: "Família" } })
    fireEvent.click(screen.getByRole("checkbox"))
    submit()
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Mensagem enviada. O escritório receberá seu contato."))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/leads")
    expect(JSON.parse(init.body)).toEqual({
      slug: "ana", name: "Maria", email: "m@x.com", area: "Família", message: "Gostaria de um retorno.",
      consent: true, website: "", startedAt: 1_700_000_000_000,
    })
  })

  it("shows the API error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: "Muitas tentativas." }) })
    render(<LeadFormSection {...props} />)
    fill()
    fireEvent.click(screen.getByRole("checkbox"))
    submit()
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Muitas tentativas."))
  })

  it("counts characters", () => {
    render(<LeadFormSection {...props} />)
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "abc" } })
    expect(screen.getByText("3/1000")).toBeInTheDocument()
  })

  it("disabled mode blocks submit and explains why", () => {
    render(<LeadFormSection {...props} disabled />)
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled()
    expect(screen.getByText("Formulário disponível após a publicação do site")).toBeInTheDocument()
  })
})
