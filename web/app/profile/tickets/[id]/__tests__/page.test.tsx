import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// jsdom does not implement scrollIntoView — stub it globally
window.HTMLElement.prototype.scrollIntoView = vi.fn()
// jsdom does not implement URL.createObjectURL
Object.defineProperty(window.URL, "createObjectURL", { value: vi.fn(() => "blob:mock-url"), writable: true })

const { mockFetch, mockUseParams } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockUseParams: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

vi.mock("next/navigation", () => ({
  useParams: mockUseParams,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}))

import UserTicketDetailPage from "@/app/profile/tickets/[id]/page"

const OPEN_TICKET = {
  id: "ticket-1",
  number: 42,
  subject: "Problema com pagamento",
  status: "open",
  category: "billing",
  createdAt: "2024-01-15T10:00:00.000Z",
  messages: [
    {
      id: "msg-1",
      senderType: "user",
      message: "Olá, tenho um problema com meu pagamento.",
      imageUrls: null,
      createdAt: "2024-01-15T10:00:00.000Z",
      senderUser: { name: "Dr. João", email: "joao@example.com" },
      senderAdmin: null,
    },
    {
      id: "msg-2",
      senderType: "admin",
      message: "Olá Dr. João, estamos verificando o problema.",
      imageUrls: null,
      createdAt: "2024-01-15T11:00:00.000Z",
      senderUser: null,
      senderAdmin: { name: "Suporte AdvLink" },
    },
  ],
}

const CLOSED_TICKET = {
  ...OPEN_TICKET,
  status: "closed",
}

describe("UserTicketDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: "ticket-1" })
  })

  describe("loading state", () => {
    it("shows 'Carregando...' while the ticket is being fetched", () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<UserTicketDetailPage />)
      expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    })
  })

  describe("ticket header", () => {
    it("renders the ticket number with # prefix", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("#42")).toBeInTheDocument())
    })

    it("renders the ticket subject", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Problema com pagamento")).toBeInTheDocument())
    })

    it("renders the status badge", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Aberto")).toBeInTheDocument())
    })

    it("renders 'Em andamento' badge for in_progress status", async () => {
      const inProgress = { ...OPEN_TICKET, status: "in_progress" }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => inProgress })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Em andamento")).toBeInTheDocument())
    })
  })

  describe("messages", () => {
    it("renders all messages", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => {
        expect(screen.getByText("Olá, tenho um problema com meu pagamento.")).toBeInTheDocument()
        expect(screen.getByText("Olá Dr. João, estamos verificando o problema.")).toBeInTheDocument()
      })
    })

    it("shows 'Você' label for user messages", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Você")).toBeInTheDocument())
    })

    it("shows the admin name for admin messages", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Suporte AdvLink")).toBeInTheDocument())
    })

    it("falls back to 'Suporte' when admin has no name", async () => {
      const noAdminName = {
        ...OPEN_TICKET,
        messages: [
          {
            ...OPEN_TICKET.messages[1],
            senderAdmin: { name: null },
          },
        ],
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => noAdminName })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Suporte")).toBeInTheDocument())
    })

    it("fetches /api/tickets/:id on mount using the URL param", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/tickets/ticket-1"))
    })
  })

  describe("reply form — open ticket", () => {
    it("renders the reply textarea", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/escreva sua resposta/i)).toBeInTheDocument()
      )
    })

    it("renders the send button", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => {
        // The send button contains a Send icon — find it by role
        const buttons = screen.getAllByRole("button")
        // There should be at least one button (attach + send)
        expect(buttons.length).toBeGreaterThanOrEqual(1)
      })
    })

    it("allows typing into the reply textarea", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))
      const textarea = screen.getByPlaceholderText(/escreva sua resposta/i)
      await userEvent.type(textarea, "Minha resposta ao suporte")
      expect(textarea).toHaveValue("Minha resposta ao suporte")
    })

    it("POSTs to /api/tickets/:id/messages when the send button is clicked with text", async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      // After send, refetch
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      const textarea = screen.getByPlaceholderText(/escreva sua resposta/i)
      await userEvent.type(textarea, "Resposta de teste")

      // Find the send button (icon button after the textarea)
      const buttons = screen.getAllByRole("button")
      // Last button in the row is the send button
      const sendButton = buttons[buttons.length - 1]
      await userEvent.click(sendButton)

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tickets/ticket-1/messages",
          expect.objectContaining({ method: "POST" })
        )
      )
    })

    it("clears the textarea after sending", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      const textarea = screen.getByPlaceholderText(/escreva sua resposta/i)
      await userEvent.type(textarea, "Texto de resposta")

      const buttons = screen.getAllByRole("button")
      const sendButton = buttons[buttons.length - 1]
      await userEvent.click(sendButton)

      await waitFor(() => expect(textarea).toHaveValue(""))
    })
  })

  describe("closed ticket", () => {
    it("shows 'Este ticket está fechado.' message", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => CLOSED_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() =>
        expect(screen.getByText(/este ticket está fechado/i)).toBeInTheDocument()
      )
    })

    it("does not render the reply textarea for a closed ticket", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => CLOSED_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByText(/este ticket está fechado/i))
      expect(screen.queryByPlaceholderText(/escreva sua resposta/i)).not.toBeInTheDocument()
    })
  })

  describe("send guard — empty message", () => {
    it("does not POST when both reply is empty and no files are attached", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      // Click send without typing anything
      const buttons = screen.getAllByRole("button")
      const sendButton = buttons[buttons.length - 1]
      await userEvent.click(sendButton)

      // Only the initial fetch was made — no POST
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("does not POST when reply is only whitespace", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      const textarea = screen.getByPlaceholderText(/escreva sua resposta/i)
      await userEvent.type(textarea, "   ")

      const buttons = screen.getAllByRole("button")
      const sendButton = buttons[buttons.length - 1]
      await userEvent.click(sendButton)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe("status labels", () => {
    it("renders 'Aguardando resposta' for waiting_customer status", async () => {
      const ticket = { ...OPEN_TICKET, status: "waiting_customer" }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ticket })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Aguardando resposta")).toBeInTheDocument())
    })

    it("renders 'Resolvido' for resolved status", async () => {
      const ticket = { ...OPEN_TICKET, status: "resolved" }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ticket })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Resolvido")).toBeInTheDocument())
    })

    it("renders 'Fechado' for closed status", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => CLOSED_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("Fechado")).toBeInTheDocument())
    })

    it("falls back to raw status string for unknown status", async () => {
      const ticket = { ...OPEN_TICKET, status: "custom_status" }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ticket })
      render(<UserTicketDetailPage />)
      await waitFor(() => expect(screen.getByText("custom_status")).toBeInTheDocument())
    })
  })

  describe("message with image attachments", () => {
    it("renders image attachments when message has imageUrls", async () => {
      const ticketWithImages = {
        ...OPEN_TICKET,
        messages: [
          {
            ...OPEN_TICKET.messages[0],
            imageUrls: ["https://s3.example.com/img1.jpg", "https://s3.example.com/img2.jpg"],
          },
        ],
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ticketWithImages })
      render(<UserTicketDetailPage />)
      await waitFor(() => {
        const images = screen.getAllByRole("img")
        expect(images.length).toBeGreaterThanOrEqual(2)
      })
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

    it("shows the attached file preview after file selection", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      addFileToInput("photo.jpg")

      // A preview image should appear
      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "photo.jpg")).toBe(true)
      })
    })

    it("removes file from preview when the remove (X) button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      addFileToInput("remove-me.jpg")

      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "remove-me.jpg")).toBe(true)
      })

      // Find the X remove button — it's within the file preview container
      // The button has absolute positioning with bg-destructive class
      const removeButton = document
        .querySelector(".bg-destructive") as HTMLButtonElement
      await userEvent.click(removeButton)

      await waitFor(() => {
        const allImgs = screen.queryAllByRole("img")
        expect(allImgs.every((img) => img.getAttribute("alt") !== "remove-me.jpg")).toBe(true)
      })
    })

    it("sends the file when handleSend is called with a file but no text", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      // Add a file without typing any text
      addFileToInput("attach.jpg")

      await waitFor(() => {
        const imgs = screen.getAllByRole("img")
        expect(imgs.some((img) => img.getAttribute("alt") === "attach.jpg")).toBe(true)
      })

      // Click send — files.length > 0 so it should proceed even with no text
      const buttons = screen.getAllByRole("button")
      const sendButton = buttons[buttons.length - 1]
      await userEvent.click(sendButton)

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tickets/ticket-1/messages",
          expect.objectContaining({ method: "POST" })
        )
      )
    })
  })

  describe("keyboard shortcut for send", () => {
    it("sends message on Ctrl+Enter keypress in the textarea", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => OPEN_TICKET })

      render(<UserTicketDetailPage />)
      await waitFor(() => screen.getByPlaceholderText(/escreva sua resposta/i))

      const textarea = screen.getByPlaceholderText(/escreva sua resposta/i)
      fireEvent.change(textarea, { target: { value: "Mensagem via teclado" } })

      // Simulate Ctrl+Enter — fires the onKeyDown handler
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/tickets/ticket-1/messages",
          expect.objectContaining({ method: "POST" })
        )
      )
    })
  })
})
