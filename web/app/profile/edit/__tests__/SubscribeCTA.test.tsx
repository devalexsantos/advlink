import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
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
