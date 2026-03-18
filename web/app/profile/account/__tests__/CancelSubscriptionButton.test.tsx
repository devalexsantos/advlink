import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal("fetch", mockFetch)

// Render Dialog inline so it is always visible in the DOM
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import CancelSubscriptionButton from "@/app/profile/account/CancelSubscriptionButton"

describe("CancelSubscriptionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("initial render", () => {
    it("renders the 'Cancelar assinatura' trigger button", () => {
      render(<CancelSubscriptionButton />)
      expect(screen.getByRole("button", { name: /cancelar assinatura/i })).toBeInTheDocument()
    })

    it("does not render the confirmation dialog initially", () => {
      render(<CancelSubscriptionButton />)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  describe("dialog opening", () => {
    it("opens the dialog when the trigger button is clicked", async () => {
      render(<CancelSubscriptionButton />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("shows the dialog title 'Cancelar assinatura'", async () => {
      render(<CancelSubscriptionButton />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      expect(screen.getByRole("heading", { name: /cancelar assinatura/i })).toBeInTheDocument()
    })

    it("renders all cancellation reasons in the select", async () => {
      render(<CancelSubscriptionButton />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      const select = screen.getByRole("combobox")
      expect(within(select).getByText("Preço muito alto")).toBeInTheDocument()
      expect(within(select).getByText("Outro")).toBeInTheDocument()
    })

    it("renders the textarea for additional details", async () => {
      render(<CancelSubscriptionButton />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      expect(screen.getByPlaceholderText(/conte um pouco mais/i)).toBeInTheDocument()
    })

    it("the confirm cancel button is disabled when no reason is selected", async () => {
      render(<CancelSubscriptionButton />)
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      // There are now two buttons with similar names; the confirm one is inside the dialog
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      expect(confirmBtn).toBeDisabled()
    })
  })

  describe("dialog interaction", () => {
    async function openDialog() {
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
    }

    it("enables the confirm button after a reason is selected", async () => {
      render(<CancelSubscriptionButton />)
      await openDialog()
      const select = screen.getByRole("combobox")
      await userEvent.selectOptions(select, "Preço muito alto")
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      expect(confirmBtn).not.toBeDisabled()
    })

    it("closes the dialog when 'Fechar' is clicked", async () => {
      render(<CancelSubscriptionButton />)
      await openDialog()
      await userEvent.click(screen.getByRole("button", { name: /fechar/i }))
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("allows typing in the details textarea", async () => {
      render(<CancelSubscriptionButton />)
      await openDialog()
      const textarea = screen.getByPlaceholderText(/conte um pouco mais/i)
      await userEvent.type(textarea, "Achei caro demais")
      expect(textarea).toHaveValue("Achei caro demais")
    })
  })

  describe("cancellation API call", () => {
    async function openAndSelectReason(reason = "Preço muito alto") {
      await userEvent.click(screen.getByRole("button", { name: /cancelar assinatura/i }))
      await userEvent.selectOptions(screen.getByRole("combobox"), reason)
    }

    it("POSTs to /api/stripe/cancel-subscription with the selected reason", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      render(<CancelSubscriptionButton />)
      await openAndSelectReason("Preço muito alto")
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/stripe/cancel-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Preço muito alto", details: "" }),
        })
      )
    })

    it("includes the details text in the POST body", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      render(<CancelSubscriptionButton />)
      await openAndSelectReason("Outro")
      await userEvent.type(screen.getByPlaceholderText(/conte um pouco mais/i), "Motivo pessoal")
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/stripe/cancel-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Outro", details: "Motivo pessoal" }),
        })
      )
    })

    it("shows success message after successful cancellation", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      await waitFor(() =>
        expect(
          screen.getByText(/sua assinatura será cancelada ao final do período atual/i)
        ).toBeInTheDocument()
      )
    })

    it("removes the trigger button after successful cancellation", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /cancelar assinatura/i })).not.toBeInTheDocument()
      )
    })

    it("shows 'Cancelando...' while the request is in flight", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      await waitFor(() =>
        expect(within(dialog).getByText(/cancelando\.\.\./i)).toBeInTheDocument()
      )
    })
  })
})
