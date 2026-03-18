import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}))

import LogoutButton from "@/components/LogoutButton"

describe("LogoutButton", () => {
  it("renders a button element", () => {
    render(<LogoutButton />)
    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("renders children text when provided", () => {
    render(<LogoutButton>Sair</LogoutButton>)
    expect(screen.getByText("Sair")).toBeInTheDocument()
  })

  it("renders the LogOut icon", () => {
    const { container } = render(<LogoutButton />)
    // Lucide renders an SVG inside the button
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("calls signOut with callbackUrl /login when clicked", async () => {
    render(<LogoutButton />)
    await userEvent.click(screen.getByRole("button"))
    expect(signOutMock).toHaveBeenCalledWith({ redirect: true, callbackUrl: "/login" })
  })

  it("calls a custom onClick handler before signOut when provided", async () => {
    const customHandler = vi.fn()
    render(<LogoutButton onClick={customHandler}>Sair</LogoutButton>)
    await userEvent.click(screen.getByRole("button"))
    expect(customHandler).toHaveBeenCalledTimes(1)
    expect(signOutMock).toHaveBeenCalledWith({ redirect: true, callbackUrl: "/login" })
  })
})
