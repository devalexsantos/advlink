import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders as render, screen, waitFor } from "@/test/test-utils"
import userEvent from "@testing-library/user-event"

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, ...props }: any) => <label htmlFor={htmlFor} {...props}>{children}</label>,
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? <div data-testid="dialog" onClick={(e: any) => { if (e.target === e.currentTarget) onOpenChange?.(false) }}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))

import PublishedCTA from "@/app/profile/edit/PublishedCTA"

const mockFetch = vi.fn()

describe("PublishedCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: profile query returns null (no server-side slug override)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: null }),
    })
    vi.stubGlobal("fetch", mockFetch)
  })

  // ---- Static rendering ----------------------------------------------------

  it("renders the published success message", () => {
    render(<PublishedCTA slug="teste" />)
    expect(screen.getByText("Seu site está publicado!")).toBeInTheDocument()
  })

  it("displays the user's public link when slug is provided", () => {
    render(<PublishedCTA slug="teste" />)
    expect(screen.getByText("https://teste.advlink.site")).toBeInTheDocument()
  })

  it("shows helpful message when no slug is set", () => {
    render(<PublishedCTA slug="" />)
    expect(screen.getByText(/Defina um link público/)).toBeInTheDocument()
  })

  it("renders the 'Alterar link' button", () => {
    render(<PublishedCTA slug="teste" />)
    expect(screen.getByText("Alterar link")).toBeInTheDocument()
  })

  it("links to the correct public URL", () => {
    render(<PublishedCTA slug="advogado-silva" />)
    const link = screen.getByText("https://advogado-silva.advlink.site")
    expect(link.closest("a")).toHaveAttribute("href", "https://advogado-silva.advlink.site")
    expect(link.closest("a")).toHaveAttribute("target", "_blank")
  })

  it("handles null slug prop", () => {
    render(<PublishedCTA slug={null} />)
    expect(screen.getByText(/Defina um link público/)).toBeInTheDocument()
  })

  it("uses the slug from server query when available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: { slug: "server-slug" } }),
    })
    render(<PublishedCTA slug={null} />)
    await waitFor(() =>
      expect(screen.getByText("https://server-slug.advlink.site")).toBeInTheDocument()
    )
  })

  // ---- Dialog: open/close --------------------------------------------------

  it("opens the 'Alterar link' dialog when the button is clicked", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByText("Alterar meu link")).toBeInTheDocument()
  })

  it("populates the slug input with the current slug when dialog opens", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    expect(slugInput).toHaveValue("meu-perfil")
  })

  it("closes the dialog when the X close button is clicked", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))
    expect(screen.getByTestId("dialog")).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText("Fechar modal"))

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  // ---- Slug input interaction -----------------------------------------------

  it("allows typing a new slug in the input", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    expect(slugInput).toHaveValue("novo-slug")
  })

  it("disables the Validar button when the slug input equals the initial slug", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    // The slug input already has "meu-perfil" (same as initial) → button disabled
    expect(screen.getByRole("button", { name: /validar/i })).toBeDisabled()
  })

  it("enables the Validar button when the slug input differs from the initial slug", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "outro-slug")

    expect(screen.getByRole("button", { name: /validar/i })).not.toBeDisabled()
  })

  // ---- Slug validation ------------------------------------------------------

  it("calls /api/profile/validate-slug when Validar is clicked", async () => {
    mockFetch
      // First call: initial profile query
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      // Second call: validate-slug
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/profile/validate-slug",
        expect.objectContaining({ method: "POST" })
      )
    )
  })

  it("shows 'Link disponível!' when validation succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() =>
      expect(screen.getByText(/Link disponível/i)).toBeInTheDocument()
    )
  })

  it("shows 'Este slug já existe' error when validation returns invalid (non-reserved)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false, slug: "slug-existente" }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "slug-existente")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() =>
      expect(screen.getByText(/Este slug já existe/i)).toBeInTheDocument()
    )
  })

  it("shows 'Este link é reservado' error when validation returns invalid with error='reserved'", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false, slug: "admin", error: "reserved" }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "admin")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() =>
      expect(screen.getByText(/Este link é reservado/i)).toBeInTheDocument()
    )
  })

  it("shows 'Verificando...' while validation is in flight", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      // Never resolves — keeps the button in "Verificando..." state
      .mockReturnValueOnce(new Promise(() => {}))

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "outro-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() =>
      expect(screen.getByText("Verificando...")).toBeInTheDocument()
    )
  })

  // ---- Slug save ------------------------------------------------------------

  it("enables the save button after a valid slug is confirmed", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))

    await waitFor(() => screen.getByText(/Link disponível/i))

    // Save button should now say "Salvar" and be enabled
    const saveButton = screen.getByRole("button", { name: /salvar/i })
    expect(saveButton).not.toBeDisabled()
  })

  it("calls PATCH /api/profile when saving a validated slug", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ profile: { slug: "novo-slug" } }),
      })
      // After save, invalidate/refetch calls
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ profile: { slug: "novo-slug" } }) })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))
    await waitFor(() => screen.getByText(/Link disponível/i))

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/profile",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ slug: "novo-slug" }),
        })
      )
    )
  })

  it("closes the dialog after a successful slug save", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profile: { slug: "novo-slug" } }),
      })

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))
    await waitFor(() => screen.getByText(/Link disponível/i))

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await waitFor(() =>
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
    )
  })

  it("does not call save when the slug input is the same as initial (Salvar button shows validation prompt)", async () => {
    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    // Slug is unchanged — save button should show "Valide antes de continuar"
    expect(screen.getByRole("button", { name: /valide antes/i })).toBeInTheDocument()
  })

  it("shows 'Salvando...' while save mutation is in flight", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, slug: "novo-slug" }),
      })
      // PATCH never resolves
      .mockReturnValueOnce(new Promise(() => {}))

    render(<PublishedCTA slug="meu-perfil" />)

    await userEvent.click(screen.getByText("Alterar link"))

    const slugInput = screen.getByPlaceholderText("seu-link")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "novo-slug")

    await userEvent.click(screen.getByRole("button", { name: /validar/i }))
    await waitFor(() => screen.getByText(/Link disponível/i))

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }))

    await waitFor(() =>
      expect(screen.getByText("Salvando...")).toBeInTheDocument()
    )
  })
})
