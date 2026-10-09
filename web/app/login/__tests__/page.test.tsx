import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const { magicProps, googleProps } = vi.hoisted(() => ({
  magicProps: vi.fn(),
  googleProps: vi.fn(),
}))

vi.mock("next/image", () => ({ default: () => null }))
vi.mock("@/app/login/_components/MagicLinkForm", () => ({
  MagicLinkForm: (props: { callbackUrl?: string }) => {
    magicProps(props)
    return null
  },
}))
vi.mock("@/app/login/_components/GoogleLoginButton", () => ({
  GoogleLoginButton: (props: { callbackUrl?: string }) => {
    googleProps(props)
    return null
  },
}))

import LoginPage from "@/app/login/page"

async function renderPage(params: Record<string, string>) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }))
}

describe("LoginPage", () => {
  it("explains an expired magic link in pt-BR", async () => {
    await renderPage({ error: "Verification" })
    expect(screen.getByRole("alert")).toHaveTextContent(/expirou ou já foi usado/i)
  })

  it("shows a generic message for unknown errors", async () => {
    await renderPage({ error: "Weird" })
    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível entrar/i)
  })

  it("shows no error box without ?error", async () => {
    await renderPage({})
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("passes a sanitized callbackUrl to both login methods", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
    await renderPage({ callbackUrl: "https://app.advlink.site/profile/tickets/t1" })
    expect(magicProps).toHaveBeenLastCalledWith({ callbackUrl: "/profile/tickets/t1" })
    expect(googleProps).toHaveBeenLastCalledWith({ callbackUrl: "/profile/tickets/t1" })

    await renderPage({ callbackUrl: "https://evil.com" })
    expect(magicProps).toHaveBeenLastCalledWith({ callbackUrl: "/profile/edit" })
    vi.unstubAllEnvs()
  })
})
