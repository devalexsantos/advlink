import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.stubGlobal("fetch", mockFetch)

import ContatosClient from "../ContatosClient"

const leads = [
  { id: "l1", name: "Maria", email: "maria@x.com", phone: "11999990000", areaTitle: "Família", message: "Preciso de ajuda\ncom guarda", createdAt: "2026-10-01T12:00:00Z", readAt: null },
  { id: "l2", name: "João", email: null, phone: null, areaTitle: null, message: "Olá", createdAt: "2026-09-01T12:00:00Z", readAt: "2026-09-02T12:00:00Z" },
]

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("ContatosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH" || init?.method === "DELETE") return { ok: true, json: async () => ({}) }
      return { ok: true, json: async () => ({ leads, unread: 1 }) }
    })
  })

  it("lists leads with contact links and highlights unread", async () => {
    wrap(<ContatosClient />)
    expect(await screen.findByText("Maria")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /maria@x.com/ })).toHaveAttribute("href", "mailto:maria@x.com")
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/11999990000")
    expect(screen.getByTestId("lead-l1")).toHaveAttribute("data-unread", "true")
    expect(screen.getByTestId("lead-l2")).toHaveAttribute("data-unread", "false")
    expect(screen.getByText(/apagadas automaticamente após 90 dias/)).toBeInTheDocument()
  })

  it("shows the empty state", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ leads: [], unread: 0 }) })
    wrap(<ContatosClient />)
    expect(await screen.findByText(/Ative o formulário em Editor → Perfil e contato/)).toBeInTheDocument()
  })

  it("marks a lead as read", async () => {
    wrap(<ContatosClient />)
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como lida" }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/leads/l1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ read: true }) })),
    )
  })

  it("deletes after confirmation", async () => {
    wrap(<ContatosClient />)
    await screen.findByText("Maria")
    await userEvent.click(within(screen.getByTestId("lead-l1")).getByRole("button", { name: /Excluir/ }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/leads/l1", expect.objectContaining({ method: "DELETE" })),
    )
  })
})
