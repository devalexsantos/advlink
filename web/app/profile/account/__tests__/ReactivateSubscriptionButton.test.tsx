import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

import ReactivateSubscriptionButton from "@/app/profile/account/ReactivateSubscriptionButton"

describe("ReactivateSubscriptionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the 'Reativar assinatura' button initially", () => {
    render(<ReactivateSubscriptionButton />)
    expect(screen.getByRole("button", { name: /reativar assinatura/i })).toBeInTheDocument()
  })

  it("button is enabled initially", () => {
    render(<ReactivateSubscriptionButton />)
    expect(screen.getByRole("button", { name: /reativar assinatura/i })).not.toBeDisabled()
  })

  it("shows 'Reativando...' while the request is in flight", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reativando/i })).toBeInTheDocument()
    )
  })

  it("disables the button while loading", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reativando/i })).toBeDisabled()
    )
  })

  it("POSTs to /api/stripe/reactivate-subscription when clicked", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/reactivate-subscription", { method: "POST" })
    )
  })

  it("shows success message after successful reactivation", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByText(/assinatura reativada com sucesso/i)).toBeInTheDocument()
    )
  })

  it("removes the button after successful reactivation", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /reativar assinatura/i })).not.toBeInTheDocument()
    )
  })

  it("keeps the button visible when the request fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reativar assinatura/i })).not.toBeDisabled()
    )
    expect(screen.queryByText(/assinatura reativada/i)).not.toBeInTheDocument()
  })

  it("re-enables the button after a failed request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<ReactivateSubscriptionButton />)
    await userEvent.click(screen.getByRole("button", { name: /reativar assinatura/i }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reativar assinatura/i })).not.toBeDisabled()
    )
  })
})
