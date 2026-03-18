import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

// Capture location.href assignments
const { mockLocationHref } = vi.hoisted(() => ({
  mockLocationHref: vi.fn(),
}))

Object.defineProperty(window, "location", {
  value: {
    get href() {
      return "http://localhost/"
    },
    set href(url: string) {
      mockLocationHref(url)
    },
  },
  writable: true,
  configurable: true,
})

import ActivateSubscriptionButton from "@/app/profile/account/ActivateSubscriptionButton"

describe("ActivateSubscriptionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the activate subscription button", () => {
    render(<ActivateSubscriptionButton />)
    expect(screen.getByRole("button", { name: /ativar assinatura/i })).toBeInTheDocument()
  })

  it("button is enabled initially", () => {
    render(<ActivateSubscriptionButton />)
    expect(screen.getByRole("button", { name: /ativar assinatura/i })).not.toBeDisabled()
  })

  it("shows 'Redirecionando...' while the request is in flight", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /redirecionando/i })).toBeInTheDocument()
    )
  })

  it("disables the button while loading", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /redirecionando/i })).toBeDisabled()
    )
  })

  it("POSTs to /api/stripe/create-checkout when clicked", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://checkout.stripe.com/pay/123" }) })
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/create-checkout", { method: "POST" })
    )
  })

  it("redirects to the returned Stripe checkout URL on success", async () => {
    const checkoutUrl = "https://checkout.stripe.com/pay/abc"
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ url: checkoutUrl }) })
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() => expect(mockLocationHref).toHaveBeenCalledWith(checkoutUrl))
  })

  it("does not redirect when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() => expect(screen.getByRole("button", { name: /ativar assinatura/i })).not.toBeDisabled())
    expect(mockLocationHref).not.toHaveBeenCalled()
  })

  it("does not redirect when the response has no url", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() => expect(screen.getByRole("button", { name: /ativar assinatura/i })).not.toBeDisabled())
    expect(mockLocationHref).not.toHaveBeenCalled()
  })

  it("re-enables the button after the request finishes", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    render(<ActivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /ativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /ativar assinatura/i })).not.toBeDisabled()
    )
  })
})
