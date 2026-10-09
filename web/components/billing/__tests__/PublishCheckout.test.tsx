import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders as render } from "@/test/test-utils"

const { mockFetch, mockRefresh, mockShowToast, useBillingStatusMock, watchState } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockRefresh: vi.fn(),
  mockShowToast: vi.fn(),
  useBillingStatusMock: vi.fn(),
  // What the status poll returns while the checkout is being watched
  watchState: { data: undefined as { published: boolean } | undefined },
}))

vi.stubGlobal("fetch", mockFetch)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}))
vi.mock("@/components/toast/ToastProvider", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))
vi.mock("@/components/billing/useBillingStatus", async () => {
  const actual = await vi.importActual<typeof import("@/components/billing/useBillingStatus")>(
    "@/components/billing/useBillingStatus"
  )
  return { ...actual, useBillingStatus: useBillingStatusMock }
})

import PublishCheckout from "@/components/billing/PublishCheckout"

function response(ok: boolean, body: unknown) {
  return { ok, json: async () => body }
}

function fakeTab() {
  return { location: { href: "" }, close: vi.fn() }
}

describe("PublishCheckout", () => {
  let tab: ReturnType<typeof fakeTab>
  let openSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    watchState.data = undefined
    useBillingStatusMock.mockImplementation(({ watch }: { watch?: boolean } = {}) => ({
      data: watch ? watchState.data : undefined,
    }))
    tab = fakeTab()
    openSpy = vi.fn(() => tab)
    window.open = openSpy as unknown as typeof window.open
  })

  async function clickCardBoleto() {
    await userEvent.click(screen.getByRole("button", { name: /cartão ou boleto/i }))
  }

  it("offers both payment methods", () => {
    render(<PublishCheckout />)
    expect(screen.getByRole("button", { name: /cartão ou boleto/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /pix/i })).toBeEnabled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  describe("starting a checkout", () => {
    it.each([
      ["Cartão ou boleto", "card_boleto"],
      ["Pix", "pix"],
    ])("POSTs method for '%s' and sends the opened tab to the payment page", async (label, method) => {
      mockFetch.mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/1" }))
      render(<PublishCheckout />)
      await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") }))

      await waitFor(() => expect(tab.location.href).toBe("https://asaas.test/pay/1"))
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/billing/checkout")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body)).toEqual({ method, replacePending: false })
    })

    it("opens the blank tab synchronously from the click (popup-blocker safe)", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank")
      expect(tab.location.href).toBe("")
    })

    it("disables both buttons while the request is in flight", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(screen.getByRole("button", { name: /cartão ou boleto/i })).toBeDisabled()
      expect(screen.getByRole("button", { name: /pix/i })).toBeDisabled()
    })

    it("falls back to navigating the current window when the popup was blocked", async () => {
      openSpy.mockReturnValue(null)
      const original = window.location
      Object.defineProperty(window, "location", { configurable: true, value: { href: "http://localhost/" } })
      try {
        mockFetch.mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/2" }))
        render(<PublishCheckout />)
        await clickCardBoleto()
        await waitFor(() => expect(window.location.href).toBe("https://asaas.test/pay/2"))
      } finally {
        Object.defineProperty(window, "location", { configurable: true, value: original })
      }
    })
  })

  describe("watching the payment", () => {
    it("shows a waiting status after the checkout opens and polls the billing status", async () => {
      mockFetch.mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/1" }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(await screen.findByRole("status")).toHaveTextContent(/aguardando a confirmação do pagamento/i)
      expect(useBillingStatusMock).toHaveBeenLastCalledWith({ watch: true })
      expect(mockShowToast).not.toHaveBeenCalled()
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it("toasts, stops waiting and refreshes the page once the site is published", async () => {
      watchState.data = { published: true }
      mockFetch.mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/1" }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/pagamento confirmado/i), expect.any(Number))
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })
  })

  describe("errors", () => {
    it("closes the blank tab and shows the server message with a support link", async () => {
      mockFetch.mockResolvedValueOnce(response(false, { error: "Falha ao criar a cobrança." }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent("Falha ao criar a cobrança.")
      expect(tab.close).toHaveBeenCalled()
      expect(screen.getByRole("link", { name: /fale com o suporte/i })).toHaveAttribute("href", "/profile/tickets/new")
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cartão ou boleto/i })).toBeEnabled()
    })

    it("uses a generic message when the error response has no message", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error("bad json") } })
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível abrir o pagamento/i)
    })

    it("treats an OK response without a url as an error", async () => {
      mockFetch.mockResolvedValueOnce(response(true, {}))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível abrir o pagamento/i)
      expect(tab.close).toHaveBeenCalled()
    })

    it("shows a connection error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network"))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível conectar/i)
      expect(tab.close).toHaveBeenCalled()
      expect(screen.getByRole("button", { name: /pix/i })).toBeEnabled()
    })

    it("clears the previous error when trying again", async () => {
      mockFetch
        .mockResolvedValueOnce(response(false, { error: "Falhou" }))
        .mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/3" }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      await screen.findByRole("alert")
      await clickCardBoleto()
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
    })
  })

  describe("409 conflicts", () => {
    it("PENDING_PAYMENT shows the open invoice link and an option to pay another way", async () => {
      mockFetch.mockResolvedValueOnce(
        response(false, { code: "PENDING_PAYMENT", error: "Você já tem uma cobrança em aberto.", invoiceUrl: "https://asaas.test/i/open" })
      )
      render(<PublishCheckout />)
      await clickCardBoleto()
      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent("Você já tem uma cobrança em aberto.")
      expect(screen.getByRole("link", { name: "Pagar a cobrança em aberto" })).toHaveAttribute("href", "https://asaas.test/i/open")
      expect(screen.getByRole("button", { name: "Pagar de outra forma" })).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /fale com o suporte/i })).not.toBeInTheDocument()
    })

    it("PENDING_PAYMENT without an invoice url only offers the alternative payment", async () => {
      mockFetch.mockResolvedValueOnce(response(false, { code: "PENDING_PAYMENT", error: "Cobrança em aberto.", invoiceUrl: null }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      await screen.findByRole("alert")
      expect(screen.queryByRole("link", { name: "Pagar a cobrança em aberto" })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Pagar de outra forma" })).toBeInTheDocument()
    })

    it("'Pagar de outra forma' retries the same method replacing the pending charge", async () => {
      mockFetch
        .mockResolvedValueOnce(response(false, { code: "PENDING_PAYMENT", error: "Cobrança em aberto.", invoiceUrl: "https://asaas.test/i/open" }))
        .mockResolvedValueOnce(response(true, { url: "https://asaas.test/pay/new" }))
      render(<PublishCheckout />)
      await userEvent.click(screen.getByRole("button", { name: /pix/i }))
      await userEvent.click(await screen.findByRole("button", { name: "Pagar de outra forma" }))

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
      expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ method: "pix", replacePending: true })
      await waitFor(() => expect(tab.location.href).toBe("https://asaas.test/pay/new"))
    })

    it("ALREADY_ACTIVE refreshes the page without showing an error", async () => {
      mockFetch.mockResolvedValueOnce(response(false, { code: "ALREADY_ACTIVE", error: "Já ativo" }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(tab.close).toHaveBeenCalled()
    })

    it("PAYMENT_IN_REVIEW shows the message without the support link", async () => {
      mockFetch.mockResolvedValueOnce(response(false, { code: "PAYMENT_IN_REVIEW", error: "Seu pagamento está em análise." }))
      render(<PublishCheckout />)
      await clickCardBoleto()
      expect(await screen.findByRole("alert")).toHaveTextContent("Seu pagamento está em análise.")
      expect(screen.queryByRole("link", { name: /fale com o suporte/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Pagar de outra forma" })).not.toBeInTheDocument()
    })
  })
})
