import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,AAA"),
    toString: vi.fn().mockResolvedValue("<svg></svg>"),
  },
}))

import DivulgarClient, { type DivulgarSite } from "../DivulgarClient"

const site: DivulgarSite = {
  name: "Ana Souza",
  url: "https://ana.advlink.site/",
  oabNumber: "123456",
  oabState: "SP",
  phone: "+5511999990000",
  email: "ana@exemplo.com",
  headline: "Direito de Família",
  isActive: true,
}

describe("DivulgarClient", () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  })

  it("renders the sections and the ethics notice", async () => {
    render(<DivulgarClient site={site} />)
    expect(screen.getByText("Divulgar meu site")).toBeInTheDocument()
    expect(screen.getByText("QR code do site")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Baixar SVG/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Baixar contato/ })).toBeInTheDocument()
    expect(screen.getByText(/Prov\. OAB 205\/2021/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: /Baixar PNG/ })).toBeEnabled())
  })

  it("copies the Instagram bio", async () => {
    render(<DivulgarClient site={site} />)
    const card = screen.getByText("Bio do Instagram").closest("div")!.parentElement!
    await userEvent.click(card.querySelector("button")!)
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("OAB/SP 123.456"))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("https://ana.advlink.site/"))
  })

  it("hides the unpublished banner when published", () => {
    render(<DivulgarClient site={site} />)
    expect(screen.queryByText(/ainda não está publicado/)).not.toBeInTheDocument()
  })

  it("shows the unpublished banner linking to the editor", () => {
    render(<DivulgarClient site={{ ...site, isActive: false }} />)
    expect(screen.getByText(/ainda não está publicado/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /editor/i })).toHaveAttribute("href", "/profile/edit")
  })
})
