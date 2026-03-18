import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// jsdom does not implement URL.createObjectURL
Object.defineProperty(window.URL, "createObjectURL", { value: vi.fn(() => "blob:mock-url"), writable: true })

const { mockFetch, mockRouterPush, mockRouterBack } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockRouterPush: vi.fn(),
  mockRouterBack: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, back: mockRouterBack }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
}))

// Shadcn Select uses Radix UI portals which are awkward in jsdom.
// Mock it to render a native <select> so we can drive it with userEvent.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label="Categoria"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

import NewTicketPage from "@/app/profile/tickets/new/page"

describe("NewTicketPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("initial render", () => {
    it("renders the 'Novo Ticket' heading", () => {
      render(<NewTicketPage />)
      expect(screen.getByRole("heading", { name: /novo ticket/i })).toBeInTheDocument()
    })

    it("renders the 'Assunto' input", () => {
      render(<NewTicketPage />)
      expect(screen.getByLabelText(/assunto/i)).toBeInTheDocument()
    })

    it("renders the 'Mensagem' textarea", () => {
      render(<NewTicketPage />)
      expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
    })

    it("renders the 'Enviar Ticket' submit button", () => {
      render(<NewTicketPage />)
      expect(screen.getByRole("button", { name: /enviar ticket/i })).toBeInTheDocument()
    })

    it("renders the 'Cancelar' button", () => {
      render(<NewTicketPage />)
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument()
    })

    it("renders the 'Anexar imagens' button", () => {
      render(<NewTicketPage />)
      expect(screen.getByRole("button", { name: /anexar imagens/i })).toBeInTheDocument()
    })

    it("does not show any error message initially", () => {
      render(<NewTicketPage />)
      // The error paragraph uses text-destructive — confirm it is absent
      expect(screen.queryByText("Erro de conexão")).not.toBeInTheDocument()
      expect(screen.queryByText("Erro ao criar ticket")).not.toBeInTheDocument()
    })

    it("has the 'Suporte' category selected by default", () => {
      render(<NewTicketPage />)
      const select = screen.getByRole("combobox", { name: /categoria/i })
      expect(select).toHaveValue("support")
    })
  })

  describe("category options", () => {
    it("renders all four category options", () => {
      render(<NewTicketPage />)
      const select = screen.getByRole("combobox", { name: /categoria/i })
      const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent)
      expect(options).toContain("Suporte")
      expect(options).toContain("Cobrança")
      expect(options).toContain("Bug / Erro")
      expect(options).toContain("Sugestão")
    })

    it("allows changing the category", async () => {
      render(<NewTicketPage />)
      const select = screen.getByRole("combobox", { name: /categoria/i })
      await userEvent.selectOptions(select, "billing")
      expect(select).toHaveValue("billing")
    })
  })

  describe("form interaction", () => {
    it("allows typing into the Assunto input", async () => {
      render(<NewTicketPage />)
      const input = screen.getByLabelText(/assunto/i)
      await userEvent.type(input, "Problema com meu plano")
      expect(input).toHaveValue("Problema com meu plano")
    })

    it("allows typing into the Mensagem textarea", async () => {
      render(<NewTicketPage />)
      const textarea = screen.getByLabelText(/mensagem/i)
      await userEvent.type(textarea, "Descrição detalhada do problema")
      expect(textarea).toHaveValue("Descrição detalhada do problema")
    })
  })

  describe("successful submission", () => {
    async function fillAndSubmit() {
      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Meu assunto")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Minha mensagem detalhada")
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
    }

    it("POSTs to /api/tickets on submit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ticket-new" }),
      })
      await fillAndSubmit()
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tickets",
          expect.objectContaining({ method: "POST" })
        )
      )
    })

    it("submits a FormData object containing the subject", async () => {
      let capturedBody: FormData | undefined
      mockFetch.mockImplementationOnce((_url: string, opts: RequestInit) => {
        capturedBody = opts.body as FormData
        return Promise.resolve({ ok: true, json: async () => ({ id: "ticket-new" }) })
      })
      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Assunto de teste")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Mensagem de teste")
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() => expect(mockFetch).toHaveBeenCalled())
      expect(capturedBody).toBeInstanceOf(FormData)
      expect((capturedBody as FormData).get("subject")).toBe("Assunto de teste")
    })

    it("redirects to /profile/tickets/:id after successful submission", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ticket-new" }),
      })
      await fillAndSubmit()
      await waitFor(() =>
        expect(mockRouterPush).toHaveBeenCalledWith("/profile/tickets/ticket-new")
      )
    })

    it("shows 'Enviando...' while the request is in flight", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Assunto")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Mensagem")
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /enviando/i })).toBeInTheDocument()
      )
    })

    it("disables the submit button while loading", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Assunto")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Mensagem")
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled()
      )
    })
  })

  describe("error handling", () => {
    async function fillForm() {
      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Assunto")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Mensagem")
    }

    it("shows the API error message when the response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Você não tem permissão" }),
      })
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() =>
        expect(screen.getByText("Você não tem permissão")).toBeInTheDocument()
      )
    })

    it("shows generic 'Erro ao criar ticket' when error field is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() =>
        expect(screen.getByText("Erro ao criar ticket")).toBeInTheDocument()
      )
    })

    it("shows 'Erro de conexão' when fetch throws a network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() =>
        expect(screen.getByText("Erro de conexão")).toBeInTheDocument()
      )
    })

    it("does not redirect when there is an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Erro qualquer" }),
      })
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() => screen.getByText("Erro qualquer"))
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it("re-enables the submit button after an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Erro qualquer" }),
      })
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() => screen.getByText("Erro qualquer"))
      expect(screen.getByRole("button", { name: /enviar ticket/i })).not.toBeDisabled()
    })

    it("clears a previous error when the user resubmits successfully", async () => {
      // First fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Erro qualquer" }),
      })
      await fillForm()
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() => screen.getByText("Erro qualquer"))

      // Second succeeds
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "ticket-ok" }) })
      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))
      await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/profile/tickets/ticket-ok"))
      expect(screen.queryByText("Erro qualquer")).not.toBeInTheDocument()
    })
  })

  describe("cancel button", () => {
    it("calls router.back() when 'Cancelar' is clicked", async () => {
      render(<NewTicketPage />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })
  })

  describe("file attachment", () => {
    // Helper: simulate adding a file to the hidden file input
    function addFileToInput(fileName: string) {
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
      const file = new File(["img-content"], fileName, { type: "image/jpeg" })
      Object.defineProperty(fileInput, "files", { value: [file], writable: false, configurable: true })
      fireEvent.change(fileInput, { target: { files: [file] } })
      return file
    }

    it("shows file preview after selecting an image", async () => {
      render(<NewTicketPage />)

      addFileToInput("anexo.jpg")

      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "anexo.jpg")).toBe(true)
      })
    })

    it("removes the file preview when the X button is clicked", async () => {
      render(<NewTicketPage />)

      addFileToInput("remove-me.jpg")

      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "remove-me.jpg")).toBe(true)
      })

      // Click the X remove button (has bg-destructive class)
      const removeButton = document.querySelector(".bg-destructive") as HTMLButtonElement
      await userEvent.click(removeButton)

      await waitFor(() => {
        const allImgs = screen.queryAllByRole("img")
        expect(allImgs.every((img) => img.getAttribute("alt") !== "remove-me.jpg")).toBe(true)
      })
    })

    it("includes the attached file in the FormData when submitting", async () => {
      let capturedBody: FormData | undefined
      mockFetch.mockImplementationOnce((_url: string, opts: RequestInit) => {
        capturedBody = opts.body as FormData
        return Promise.resolve({ ok: true, json: async () => ({ id: "ticket-with-file" }) })
      })

      render(<NewTicketPage />)
      await userEvent.type(screen.getByLabelText(/assunto/i), "Assunto com arquivo")
      await userEvent.type(screen.getByLabelText(/mensagem/i), "Mensagem com arquivo")

      addFileToInput("document.jpg")

      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "document.jpg")).toBe(true)
      })

      await userEvent.click(screen.getByRole("button", { name: /enviar ticket/i }))

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())
      expect(capturedBody).toBeInstanceOf(FormData)
      // The file should be included in the FormData as "images"
      const imagesField = (capturedBody as FormData).get("images")
      expect(imagesField).toBeTruthy()
    })
  })
})
