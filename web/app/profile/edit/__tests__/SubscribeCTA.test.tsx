import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders as render } from "@/test/test-utils"

const { fetchProfileMock } = vi.hoisted(() => ({ fetchProfileMock: vi.fn() }))
vi.mock("@/app/profile/edit/api", () => ({ fetchProfile: fetchProfileMock }))
vi.mock("@/app/profile/edit/ChangeSlugButton", () => ({
  default: ({ effectiveSlug }: { effectiveSlug: string }) => <button type="button">Alterar link ({effectiveSlug})</button>,
}))
import userEvent from "@testing-library/user-event"

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

import SubscribeCTA from "@/app/profile/edit/SubscribeCTA"

describe("SubscribeCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    fetchProfileMock.mockResolvedValue({ profile: { slug: "joao-silva-1-x7k" } })
  })

  it("shows the future public address and lets the user change it before paying", async () => {
    render(<SubscribeCTA />)
    expect(await screen.findByText("joao-silva-1-x7k.advlink.site")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alterar link (joao-silva-1-x7k)" })).toBeInTheDocument()
  })

  it("hides the address line when there is no slug yet", async () => {
    fetchProfileMock.mockResolvedValue({ profile: { slug: null } })
    render(<SubscribeCTA />)
    await screen.findByText("Sua página ainda não está publicada.")
    expect(screen.queryByText(/seu endereço será/i)).not.toBeInTheDocument()
  })

  it("renders the unpublished warning message", () => {
    render(<SubscribeCTA />)
    expect(screen.getByText("Sua página ainda não está publicada.")).toBeInTheDocument()
  })

  it("renders the 'Publicar página' button", () => {
    render(<SubscribeCTA />)
    expect(screen.getByText("Publicar página")).toBeInTheDocument()
  })

  it("calls /api/stripe/create-checkout and redirects on click", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session123" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    // Mock window.location
    const locationMock = { href: "" }
    Object.defineProperty(window, "location", { value: locationMock, writable: true })

    render(<SubscribeCTA />)
    const btn = screen.getByText("Publicar página").closest("button")!
    await userEvent.click(btn)

    expect(mockFetch).toHaveBeenCalledWith("/api/stripe/create-checkout", { method: "POST" })
    expect(locationMock.href).toBe("https://checkout.stripe.com/session123")
  })

  it("does not redirect if fetch fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal("fetch", mockFetch)

    const locationMock = { href: "" }
    Object.defineProperty(window, "location", { value: locationMock, writable: true })

    render(<SubscribeCTA />)
    const btn = screen.getByText("Publicar página").closest("button")!
    await userEvent.click(btn)

    expect(locationMock.href).toBe("")
  })
})
