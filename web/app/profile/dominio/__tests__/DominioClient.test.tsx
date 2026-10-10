import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.stubGlobal("fetch", mockFetch)

import DominioClient, { aRecordName } from "../DominioClient"

const base = {
  host: "escritorio.adv.br",
  status: "pending_dns",
  txtName: "_advlink.escritorio.adv.br",
  txtValue: "advlink-verify=abc123",
  targetIp: "203.0.113.10",
  error: null,
  activatedAt: null,
  lastCheckedAt: null,
}

function json(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("aRecordName", () => {
  it("uses @ for apex domains and the host for subdomains", () => {
    expect(aRecordName("escritorio.adv.br").name).toBe("@")
    expect(aRecordName("exemplo.com.br").name).toBe("@")
    expect(aRecordName("exemplo.com").name).toBe("@")
    expect(aRecordName("www.exemplo.com.br")).toEqual({ name: "www.exemplo.com.br", isSubdomain: true })
  })
})

describe("DominioClient", () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  })

  it("shows the coming-soon notice when not configured", async () => {
    mockFetch.mockResolvedValue(json({ domain: null, configured: false }))
    wrap(<DominioClient />)
    expect(await screen.findByText("Domínio próprio estará disponível em breve.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Seu domínio")).not.toBeInTheDocument()
  })

  it("connects a domain from the empty state", async () => {
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "PUT" ? json({ domain: base }) : json({ domain: null, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.type(await screen.findByLabelText("Seu domínio"), "escritorio.adv.br")
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(await screen.findByText("Aguardando DNS")).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/custom-domain",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ host: "escritorio.adv.br" }) }),
    )
  })

  it("shows API errors on connect", async () => {
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "PUT" ? json({ error: "Domínio já em uso" }, false) : json({ domain: null, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.type(await screen.findByLabelText("Seu domínio"), "x.com.br")
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Domínio já em uso")
  })

  it("shows DNS instructions with copy buttons when pending", async () => {
    mockFetch.mockResolvedValue(json({ domain: base, configured: true }))
    wrap(<DominioClient />)
    expect(await screen.findByText("Aguardando DNS")).toBeInTheDocument()
    expect(screen.getByText("203.0.113.10")).toBeInTheDocument()
    expect(screen.getByText("@")).toBeInTheDocument()
    expect(screen.getByText(/nuvem cinza/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Copiar Valor" })[0])
    expect(writeText).toHaveBeenCalled()
  })

  it("verifies and becomes active", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ domain: { ...base, status: "active" } })
        : json({ domain: base, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.click(await screen.findByRole("button", { name: "Verificar agora" }))
    expect(await screen.findByText("Ativo")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /https:\/\/escritorio\.adv\.br/ })).toHaveAttribute(
      "href",
      "https://escritorio.adv.br",
    )
    expect(screen.queryByText("Como configurar o DNS")).not.toBeInTheDocument()
  })

  it("shows the explanation returned by verify", async () => {
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ domain: { ...base, error: "Registro TXT não encontrado" } })
        : json({ domain: base, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.click(await screen.findByRole("button", { name: "Verificar agora" }))
    expect(await screen.findByText("Registro TXT não encontrado")).toBeInTheDocument()
  })

  it("shows verify failures (site not published)", async () => {
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ error: "Publique o site antes de conectar o domínio" }, false)
        : json({ domain: base, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.click(await screen.findByRole("button", { name: "Verificar agora" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Publique o site")
  })

  it("shows error status with message", async () => {
    mockFetch.mockResolvedValue(json({ domain: { ...base, status: "error", error: "Falha no certificado" }, configured: true }))
    wrap(<DominioClient />)
    expect(await screen.findByText("Erro")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Falha no certificado")
  })

  it("removes the domain after confirmation", async () => {
    mockFetch.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "DELETE" ? json({}) : json({ domain: base, configured: true }),
    )
    wrap(<DominioClient />)
    await userEvent.click(await screen.findByRole("button", { name: "Remover domínio" }))
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }))
    await waitFor(() => expect(screen.getByLabelText("Seu domínio")).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith("/api/custom-domain", { method: "DELETE" })
  })
})
