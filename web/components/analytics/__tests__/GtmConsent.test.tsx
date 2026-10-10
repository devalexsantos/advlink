import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next/script", () => ({
  default: (props: { id?: string; dangerouslySetInnerHTML?: { __html: string } }) => (
    <script data-testid="gtm" id={props.id} dangerouslySetInnerHTML={props.dangerouslySetInnerHTML} />
  ),
}))

import { GtmConsent } from "../GtmConsent"

const KEY = "advlink_consent_GTM-ABCD123"
const ui = () => <GtmConsent gtmContainerId="GTM-ABCD123" privacyUrl="https://ana.advlink.site/privacidade" />

describe("GtmConsent", () => {
  beforeEach(() => localStorage.clear())

  it("shows the banner and does not load GTM before a choice", () => {
    render(ui())
    expect(screen.getByRole("region", { name: "Aviso de cookies" })).toBeInTheDocument()
    expect(screen.queryByTestId("gtm")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Saiba mais" })).toHaveAttribute("href", "https://ana.advlink.site/privacidade")
  })

  it("loads GTM after accepting and hides the banner", () => {
    render(ui())
    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }))
    expect(localStorage.getItem(KEY)).toBe("granted")
    expect(screen.getByTestId("gtm").innerHTML).toContain("GTM-ABCD123")
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("does not load GTM after declining and hides the banner", () => {
    render(ui())
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }))
    expect(localStorage.getItem(KEY)).toBe("denied")
    expect(screen.queryByTestId("gtm")).not.toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("remembers a previous acceptance without showing the banner", () => {
    localStorage.setItem(KEY, "granted")
    render(ui())
    expect(screen.getByTestId("gtm")).toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("stays silent after a previous refusal", () => {
    localStorage.setItem(KEY, "denied")
    render(ui())
    expect(screen.queryByTestId("gtm")).not.toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("still works when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(ui())
    expect(screen.getByRole("region")).toBeInTheDocument()
    expect(screen.queryByTestId("gtm")).not.toBeInTheDocument()
    spy.mockRestore()
  })
})
