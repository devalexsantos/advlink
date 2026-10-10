import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { createPreviewLinkMock } = vi.hoisted(() => ({ createPreviewLinkMock: vi.fn() }))
vi.mock("@/app/profile/edit/api", () => ({ createPreviewLink: createPreviewLinkMock }))

import SharePreviewButton from "@/app/profile/edit/SharePreviewButton"

const link = { url: "https://app.advlink.site/previa/abc123", expiresAt: "2026-10-17T15:00:00.000Z" }

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
}

describe("SharePreviewButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates the link, copies it and shows the expiry and an open link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    createPreviewLinkMock.mockResolvedValue(link)
    render(<SharePreviewButton />)

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar prévia" }))

    expect(await screen.findByText("Link copiado.")).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(link.url)
    expect(screen.getByText(/Link válido até 17\/10/)).toBeInTheDocument()
    const open = screen.getByRole("link", { name: /Abrir prévia/ })
    expect(open).toHaveAttribute("href", link.url)
    expect(open).toHaveAttribute("target", "_blank")
  })

  it("falls back to a selectable input when the clipboard is unavailable", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")))
    createPreviewLinkMock.mockResolvedValue(link)
    render(<SharePreviewButton />)

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar prévia" }))

    const input = await screen.findByLabelText("Copie o link abaixo:")
    expect(input).toHaveValue(link.url)
    expect(input).toHaveAttribute("readonly")
    expect(screen.queryByText("Link copiado.")).not.toBeInTheDocument()
  })

  it("shows the error message (403/429 text) and no link when creation fails", async () => {
    createPreviewLinkMock.mockRejectedValue(new Error("Você gerou muitos links em pouco tempo. Aguarde um instante e tente de novo."))
    render(<SharePreviewButton />)

    await userEvent.click(screen.getByRole("button", { name: "Compartilhar prévia" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/muitos links/i)
    expect(screen.queryByRole("link", { name: /abrir prévia/i })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartilhar prévia" })).toBeEnabled())
  })
})
