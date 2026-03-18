import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

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

import UserTicketsPage from "@/app/profile/tickets/page"

const TICKETS = [
  {
    id: "ticket-1",
    number: 1,
    subject: "Problema com pagamento",
    status: "open",
    category: "billing",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-16T10:00:00.000Z",
    _count: { messages: 3 },
  },
  {
    id: "ticket-2",
    number: 2,
    subject: "Dúvida sobre funcionalidade",
    status: "resolved",
    category: "support",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-12T10:00:00.000Z",
    _count: { messages: 5 },
  },
]

describe("UserTicketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("page structure", () => {
    it("renders the 'Meus Tickets' heading", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      expect(screen.getByRole("heading", { name: /meus tickets/i })).toBeInTheDocument()
    })

    it("renders the 'Novo Ticket' button linking to /profile/tickets/new", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      const link = screen.getByRole("link", { name: /novo ticket/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/profile/tickets/new")
    })

    it("renders the informational notice about 24-hour response time", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      expect(screen.getByText(/24 horas úteis/i)).toBeInTheDocument()
    })

    it("renders table headers: #, Assunto, Status, Msgs, Atualizado", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /assunto/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /msgs/i })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: /atualizado/i })).toBeInTheDocument()
    })
  })

  describe("empty state", () => {
    it("shows the empty state message when there are no tickets", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
      render(<UserTicketsPage />)
      await waitFor(() =>
        expect(screen.getByText(/nenhum ticket/i)).toBeInTheDocument()
      )
    })

    it("does not render any ticket row links in empty state", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
      render(<UserTicketsPage />)
      await waitFor(() => screen.getByText(/nenhum ticket/i))
      // Only the 'Novo Ticket' link should remain
      const links = screen.getAllByRole("link")
      const ticketLinks = links.filter((l) => l.getAttribute("href")?.startsWith("/profile/tickets/ticket-"))
      expect(ticketLinks).toHaveLength(0)
    })
  })

  describe("ticket list", () => {
    it("renders ticket subjects as links to their detail pages", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() =>
        expect(screen.getByRole("link", { name: /problema com pagamento/i })).toBeInTheDocument()
      )
      expect(screen.getByRole("link", { name: /problema com pagamento/i })).toHaveAttribute(
        "href",
        "/profile/tickets/ticket-1"
      )
    })

    it("renders all ticket subjects", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => {
        expect(screen.getByText("Problema com pagamento")).toBeInTheDocument()
        expect(screen.getByText("Dúvida sobre funcionalidade")).toBeInTheDocument()
      })
    })

    it("renders ticket numbers with # prefix", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => {
        expect(screen.getByText("#1")).toBeInTheDocument()
        expect(screen.getByText("#2")).toBeInTheDocument()
      })
    })

    it("renders the 'Aberto' status badge for open tickets", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => expect(screen.getByText("Aberto")).toBeInTheDocument())
    })

    it("renders the 'Resolvido' status badge for resolved tickets", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => expect(screen.getByText("Resolvido")).toBeInTheDocument())
    })

    it("renders the message count for each ticket", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument()
        expect(screen.getByText("5")).toBeInTheDocument()
      })
    })

    it("fetches /api/tickets on mount", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => TICKETS })
      render(<UserTicketsPage />)
      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/tickets"))
    })

    it("renders 'Em andamento' label for in_progress status", async () => {
      const inProgressTicket = [{ ...TICKETS[0], status: "in_progress" }]
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => inProgressTicket })
      render(<UserTicketsPage />)
      await waitFor(() => expect(screen.getByText("Em andamento")).toBeInTheDocument())
    })

    it("renders 'Aguardando resposta' for waiting_customer status", async () => {
      const waitingTicket = [{ ...TICKETS[0], status: "waiting_customer" }]
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => waitingTicket })
      render(<UserTicketsPage />)
      await waitFor(() => expect(screen.getByText("Aguardando resposta")).toBeInTheDocument())
    })
  })
})
