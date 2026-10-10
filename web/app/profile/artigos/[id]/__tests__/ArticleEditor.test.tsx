import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const { mockFetch, push } = vi.hoisted(() => ({ mockFetch: vi.fn(), push: vi.fn() }))
vi.stubGlobal("fetch", mockFetch)
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: ({ content, onChange }: { content: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Conteúdo do artigo" value={content} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import ArticleEditor from "../ArticleEditor"

const article = {
  id: "a1", slug: "guarda", title: "Guarda", excerpt: "", content: "", coverImageUrl: null,
  status: "draft", publishedAt: null, metaDescription: "", updatedAt: "2026-10-01T00:00:00Z",
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><ArticleEditor id="a1" siteUrl="https://ana.advlink.site/" /></QueryClientProvider>)
}

function patchCalls() {
  return mockFetch.mock.calls.filter((c) => c[1]?.method === "PATCH")
}

describe("ArticleEditor", () => {
  let patchResponse: { ok: boolean; status?: number; json: () => Promise<unknown> }
  beforeEach(() => {
    vi.clearAllMocks()
    patchResponse = { ok: true, json: async () => ({ article: { ...article, title: "Guarda" } }) }
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return patchResponse
      if (url === "/api/articles/generate-draft") {
        return { ok: true, json: async () => ({ content: "## Texto IA", excerpt: "Resumo IA" }) }
      }
      return { ok: true, json: async () => ({ article }) }
    })
  })

  it("shows the public URL preview and saves a draft", async () => {
    wrap()
    expect(await screen.findByDisplayValue("Guarda")).toBeInTheDocument()
    expect(screen.getByText("https://ana.advlink.site/artigos/guarda")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    const body = JSON.parse(patchCalls()[0][1].body)
    expect(body.title).toBe("Guarda")
    expect(body.status).toBeUndefined()
    expect(await screen.findByText("Rascunho salvo.")).toBeInTheDocument()
  })

  it("requires the review checkbox to publish", async () => {
    wrap()
    const publish = await screen.findByRole("button", { name: "Publicar" })
    expect(publish).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox"))
    expect(publish).toBeEnabled()
    await userEvent.click(publish)
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    expect(JSON.parse(patchCalls()[0][1].body)).toMatchObject({ status: "published", reviewed: true })
  })

  it("fills content and excerpt with the AI draft", async () => {
    wrap()
    await userEvent.click(await screen.findByRole("button", { name: /Gerar rascunho com IA/ }))
    expect(screen.getByLabelText("Tema ou título")).toHaveValue("Guarda")
    await userEvent.click(screen.getByRole("button", { name: "Gerar rascunho" }))
    await waitFor(() => expect(screen.getByLabelText("Conteúdo do artigo")).toHaveValue("## Texto IA"))
    expect(screen.getByLabelText("Resumo")).toHaveValue("Resumo IA")
  })

  it("asks for confirmation before replacing existing content", async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url === "/api/articles/generate-draft"
        ? { ok: true, json: async () => ({ content: "NOVO", excerpt: "" }) }
        : { ok: true, json: async () => ({ article: { ...article, content: "<p>Meu texto</p>" } }) },
    )
    wrap()
    await userEvent.click(await screen.findByRole("button", { name: /Gerar rascunho com IA/ }))
    await userEvent.click(screen.getByRole("button", { name: "Gerar rascunho" }))
    expect(await screen.findByText(/Substituir o texto atual/)).toBeInTheDocument()
    expect(screen.getByLabelText("Conteúdo do artigo")).toHaveValue("<p>Meu texto</p>")
    await userEvent.click(screen.getByRole("button", { name: "Substituir conteúdo" }))
    expect(screen.getByLabelText("Conteúdo do artigo")).toHaveValue("NOVO")
  })

  it("shows the API error for a taken slug", async () => {
    patchResponse = { ok: false, status: 409, json: async () => ({ error: "Já existe um artigo com este endereço." }) }
    wrap()
    await userEvent.click(await screen.findByRole("button", { name: "Salvar rascunho" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um artigo com este endereço.")
  })

  it("blocks an invalid slug on the client", async () => {
    wrap()
    const slug = await screen.findByLabelText(/Endereço do artigo/)
    await userEvent.clear(slug)
    await userEvent.type(slug, "Meu Artigo")
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/letras minúsculas/)
    await userEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }))
    expect(patchCalls()).toHaveLength(0)
  })
})
