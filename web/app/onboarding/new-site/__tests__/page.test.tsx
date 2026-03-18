import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch, mockRouterPush } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockRouterPush: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

// next/link renders an anchor tag — the default behaviour is fine for these tests,
// but we keep the mock consistent with the project pattern.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import NewSitePage from "@/app/onboarding/new-site/page"

describe("NewSitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("initial render", () => {
    it("renders the page heading", () => {
      render(<NewSitePage />)
      expect(screen.getByRole("heading", { name: /dê um nome ao seu novo site/i })).toBeInTheDocument()
    })

    it("renders the descriptive subtitle", () => {
      render(<NewSitePage />)
      expect(
        screen.getByText(/escolha um nome interno para identificar este site/i)
      ).toBeInTheDocument()
    })

    it("renders a text input with the correct placeholder", () => {
      render(<NewSitePage />)
      expect(screen.getByPlaceholderText("Nome do site")).toBeInTheDocument()
    })

    it("renders the 'Continuar' submit button", () => {
      render(<NewSitePage />)
      expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument()
    })

    it("renders the 'Voltar ao dashboard' link pointing to /profile/edit", () => {
      render(<NewSitePage />)
      const link = screen.getByRole("link", { name: /voltar ao dashboard/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/profile/edit")
    })

    it("does not show any error message on first render", () => {
      render(<NewSitePage />)
      // The error paragraph contains text-red-500; assert it is absent
      expect(screen.queryByText(/Digite um nome|Erro ao criar site/)).not.toBeInTheDocument()
    })
  })

  describe("form validation", () => {
    it("shows an error when the form is submitted with an empty name", async () => {
      render(<NewSitePage />)
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      expect(screen.getByText("Digite um nome para o site")).toBeInTheDocument()
    })

    it("does not call fetch when the name is empty", async () => {
      render(<NewSitePage />)
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("shows an error when the name is only whitespace", async () => {
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "   ")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      expect(screen.getByText("Digite um nome para o site")).toBeInTheDocument()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("successful submission", () => {
    it("POSTs to /api/sites with the trimmed site name", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "site-new" }) })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "  Escritório SP  ")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce())
      expect(mockFetch).toHaveBeenCalledWith("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Escritório SP" }),
      })
    })

    it("redirects to /onboarding/profile after a successful POST", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "site-new" }) })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Escritório SP")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/onboarding/profile"))
    })

    it("shows 'Criando...' while the request is in flight", async () => {
      // Never resolves so we can inspect the loading state
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Teste")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(screen.getByRole("button", { name: "Criando..." })).toBeInTheDocument())
    })

    it("disables the submit button while loading", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Teste")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Criando..." })).toBeDisabled()
      )
    })
  })

  describe("error handling", () => {
    it("shows the API error message when the response is not ok and includes an error field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Você atingiu o limite de sites" }),
      })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() =>
        expect(screen.getByText("Você atingiu o limite de sites")).toBeInTheDocument()
      )
    })

    it("shows generic error 'Erro ao criar site' when response is not ok and has no error field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(screen.getByText("Erro ao criar site")).toBeInTheDocument())
    })

    it("shows generic error 'Erro ao criar site' when fetch throws a network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(screen.getByText("Erro ao criar site")).toBeInTheDocument())
    })

    it("does not redirect when the API returns an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Limite atingido" }),
      })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => screen.getByText("Limite atingido"))
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it("re-enables the submit button after an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Erro qualquer" }),
      })
      render(<NewSitePage />)
      await userEvent.type(screen.getByPlaceholderText("Nome do site"), "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => screen.getByText("Erro qualquer"))
      expect(screen.getByRole("button", { name: "Continuar" })).not.toBeDisabled()
    })

    it("clears a previous error when the user submits again successfully", async () => {
      // First submission fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Erro qualquer" }),
      })
      render(<NewSitePage />)
      const input = screen.getByPlaceholderText("Nome do site")
      await userEvent.type(input, "Novo Site")
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => screen.getByText("Erro qualquer"))

      // Second submission succeeds
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "site-new" }) })
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }))
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/onboarding/profile"))
      expect(screen.queryByText("Erro qualquer")).not.toBeInTheDocument()
    })
  })

  describe("user interactions", () => {
    it("allows typing into the name input and reflects the value", async () => {
      render(<NewSitePage />)
      const input = screen.getByPlaceholderText("Nome do site")
      await userEvent.type(input, "Escritório Curitiba")
      expect(input).toHaveValue("Escritório Curitiba")
    })
  })
})
