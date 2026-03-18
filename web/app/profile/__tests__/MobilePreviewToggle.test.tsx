import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

// usePathname is globally mocked in test/setup.ts to return "/".
// We override it per-test to simulate the /profile/edit path.
const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(() => "/"),
}))

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

import { MobilePreviewProvider, useMobilePreview } from "@/app/profile/MobilePreviewContext"
import { MobilePreviewToggle } from "@/app/profile/MobilePreviewToggle"

function renderWithProvider() {
  return render(
    <MobilePreviewProvider>
      <MobilePreviewToggle />
    </MobilePreviewProvider>
  )
}

describe("MobilePreviewToggle", () => {
  it("renders nothing when not on /profile/edit", () => {
    pathnameMock.mockReturnValue("/profile/analytics")
    const { container } = renderWithProvider()
    expect(container.firstChild).toBeNull()
  })

  it("renders the Pré-visualizar button by default on /profile/edit", () => {
    pathnameMock.mockReturnValue("/profile/edit")
    renderWithProvider()
    expect(screen.getByRole("button", { name: /pré-visualizar/i })).toBeInTheDocument()
  })

  it("does not render the Editar button when mobilePreview is false", () => {
    pathnameMock.mockReturnValue("/profile/edit")
    renderWithProvider()
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument()
  })

  it("switches to the Editar button after clicking Pré-visualizar", async () => {
    pathnameMock.mockReturnValue("/profile/edit")
    renderWithProvider()

    await userEvent.click(screen.getByRole("button", { name: /pré-visualizar/i }))

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /pré-visualizar/i })).not.toBeInTheDocument()
  })

  it("switches back to Pré-visualizar after clicking Editar", async () => {
    pathnameMock.mockReturnValue("/profile/edit")
    renderWithProvider()

    await userEvent.click(screen.getByRole("button", { name: /pré-visualizar/i }))
    await userEvent.click(screen.getByRole("button", { name: /editar/i }))

    expect(screen.getByRole("button", { name: /pré-visualizar/i })).toBeInTheDocument()
  })

  it("calls setMobilePreview(true) when Pré-visualizar is clicked", async () => {
    pathnameMock.mockReturnValue("/profile/edit")

    const setMobilePreview = vi.fn()

    // Spy on the context hook to verify the setter is called correctly
    vi.spyOn(
      await import("@/app/profile/MobilePreviewContext"),
      "useMobilePreview"
    ).mockReturnValueOnce({ mobilePreview: false, setMobilePreview })

    render(<MobilePreviewToggle />)

    await userEvent.click(screen.getByRole("button", { name: /pré-visualizar/i }))
    expect(setMobilePreview).toHaveBeenCalledWith(true)
  })

  it("calls setMobilePreview(false) when Editar is clicked", async () => {
    pathnameMock.mockReturnValue("/profile/edit")

    const setMobilePreview = vi.fn()

    vi.spyOn(
      await import("@/app/profile/MobilePreviewContext"),
      "useMobilePreview"
    ).mockReturnValueOnce({ mobilePreview: true, setMobilePreview })

    render(<MobilePreviewToggle />)

    await userEvent.click(screen.getByRole("button", { name: /editar/i }))
    expect(setMobilePreview).toHaveBeenCalledWith(false)
  })
})
