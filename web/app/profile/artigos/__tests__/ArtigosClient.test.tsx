import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const { mockFetch, push } = vi.hoisted(() => ({ mockFetch: vi.fn(), push: vi.fn() }))
vi.stubGlobal("fetch", mockFetch)
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

import ArtigosClient from "../ArtigosClient"

const articles = [
  { id: "a1", slug: "guarda", title: "Guarda compartilhada", status: "published", excerpt: null, coverImageUrl: null, publishedAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" },
  { id: "a2", slug: "rascunho", title: "Meu rascunho", status: "draft", excerpt: null, coverImageUrl: null, publishedAt: null, updatedAt: "2026-10-03T00:00:00Z" },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ArtigosClient siteUrl="https://ana.advlink.site/" /></QueryClientProvider>)
}

describe("ArtigosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "POST"
        ? { ok: true, json: async () => ({ article: { id: "new1" } }) }
        : { ok: true, json: async () => ({ articles }) },
    )
  })

  it("lists articles with status badges and site link only for published", async () => {
    wrap()
    expect(await screen.findByText("Guarda compartilhada")).toBeInTheDocument()
    expect(screen.getByText("Publicado")).toBeInTheDocument()
    expect(screen.getByText("Rascunho")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: /Ver no site/ })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "https://ana.advlink.site/artigos/guarda")
  })

  it("creates a new article and navigates to the editor", async () => {
    wrap()
    await screen.findByText("Meu rascunho")
    await userEvent.click(screen.getByRole("button", { name: /Novo artigo/ }))
    await userEvent.type(screen.getByLabelText("Título"), "Inventário")
    await userEvent.click(screen.getByRole("button", { name: "Criar artigo" }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile/artigos/new1"))
    expect(mockFetch).toHaveBeenCalledWith("/api/articles", expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Inventário" }) }))
  })
})
