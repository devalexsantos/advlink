import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { mockFetch, mockRefresh } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
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

    async function confirm() {
      const dialog = screen.getByRole("dialog")
      const confirmBtn = within(dialog).getAllByRole("button").find(
        (btn) => btn.textContent?.includes("Cancelar assinatura")
      )!
      await userEvent.click(confirmBtn)
      return dialog
    }

    function jsonResponse(ok: boolean, body: unknown) {
      return { ok, json: async () => body }
    }

    it("POSTs to /api/billing/cancel with only the reason when no details were typed", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(true, { activeUntil: "2026-11-05" }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason("Preço muito alto")
      await confirm()
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/billing/cancel")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body)).toEqual({ reason: "Preço muito alto" })
    })

    it("includes the details text in the POST body", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(true, { activeUntil: "2026-11-05" }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason("Outro")
      await userEvent.type(screen.getByPlaceholderText(/conte um pouco mais/i), "Motivo pessoal")
      await confirm()
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ reason: "Outro", details: "Motivo pessoal" })
    })

    it("shows the date the site stays online, refreshes the page and removes the trigger on success", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(true, { activeUntil: "2026-11-05" }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      await confirm()
      expect(
        await screen.findByText(/Assinatura cancelada\. Seu site continua no ar até 05\/11\/2026\./)
      ).toBeInTheDocument()
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole("button", { name: /cancelar assinatura/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("tells the site went offline when the server returns no activeUntil", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(true, { activeUntil: null }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      await confirm()
      expect(await screen.findByText(/Seu site saiu do ar\./)).toBeInTheDocument()
    })

    it("shows 'Cancelando...' while the request is in flight", async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = await confirm()
      expect(await within(dialog).findByText(/cancelando\.\.\./i)).toBeInTheDocument()
    })

    it("shows the server error inside the dialog and keeps it open without refreshing", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(false, { error: "Nenhuma assinatura ativa para cancelar." }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = await confirm()
      const alert = await within(dialog).findByRole("alert")
      expect(alert).toHaveTextContent("Nenhuma assinatura ativa para cancelar.")
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it("falls back to a generic message when the error response has no body", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error("bad json") } })
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = await confirm()
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(/não foi possível cancelar agora/i)
    })

    it("shows a connection error when the request fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network"))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      const dialog = await confirm()
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(/não foi possível conectar/i)
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it("clears the previous error when the user retries", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(false, { error: "Falhou" }))
        .mockResolvedValueOnce(jsonResponse(true, { activeUntil: "2026-11-05" }))
      render(<CancelSubscriptionButton />)
      await openAndSelectReason()
      await confirm()
      await screen.findByText("Falhou")
      await confirm()
      await screen.findByText(/Assinatura cancelada/)
      expect(screen.queryByText("Falhou")).not.toBeInTheDocument()
    })
  })
})
