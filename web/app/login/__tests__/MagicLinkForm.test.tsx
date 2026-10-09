import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }))
vi.mock("next-auth/react", () => ({ signIn: signInMock }))

import { MagicLinkForm } from "@/app/login/_components/MagicLinkForm"

describe("MagicLinkForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInMock.mockResolvedValue({ ok: true, error: null })
  })

  it("sends the link when pressing Enter", async () => {
    render(<MagicLinkForm />)
    await userEvent.type(screen.getByLabelText("E-mail"), "joao@exemplo.com{enter}")
    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith("email", {
        email: "joao@exemplo.com",
        redirect: false,
        callbackUrl: "/profile/edit",
      })
    )
    expect(await screen.findByText(/verifique seu e-mail/i)).toBeInTheDocument()
  })

  it("forwards the callbackUrl it receives", async () => {
    render(<MagicLinkForm callbackUrl="/profile/tickets/t1" />)
    await userEvent.type(screen.getByLabelText("E-mail"), "joao@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: /enviar link/i }))
    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith("email", expect.objectContaining({ callbackUrl: "/profile/tickets/t1" }))
    )
  })

  it("shows an error when sending fails", async () => {
    signInMock.mockResolvedValue({ ok: false, error: "EmailSignin" })
    render(<MagicLinkForm />)
    await userEvent.type(screen.getByLabelText("E-mail"), "joao@exemplo.com{enter}")
    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível enviar/i)
  })

  it("lets the user go back and use another e-mail", async () => {
    render(<MagicLinkForm />)
    await userEvent.type(screen.getByLabelText("E-mail"), "errado@exemplo.com{enter}")
    await userEvent.click(await screen.findByRole("button", { name: /usar outro e-mail/i }))
    expect(screen.getByLabelText("E-mail")).toHaveValue("errado@exemplo.com")
  })

  it("blocks resending during the cooldown", async () => {
    render(<MagicLinkForm />)
    await userEvent.type(screen.getByLabelText("E-mail"), "joao@exemplo.com{enter}")
    const resend = await screen.findByRole("button", { name: /reenviar em/i })
    expect(resend).toBeDisabled()
  })
})
