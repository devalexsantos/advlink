import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders as render, screen } from "@/test/test-utils"

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))

import PublishedCTA from "@/app/profile/edit/PublishedCTA"

describe("PublishedCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: null }),
    }))
  })

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
})
