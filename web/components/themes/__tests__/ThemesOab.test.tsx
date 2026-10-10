import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/app/adv/[slug]/TeamCarousel", () => ({ TeamCarousel: () => null }))

import Theme02 from "../02/Theme02"
import Theme03 from "../03/Theme03"
import Theme04 from "../04/Theme04"

const base = {
  areas: [],
  primary: "#112233",
  text: "#ffffff",
  secondary: "#eeeeee",
}

describe.each([
  ["Theme02", Theme02],
  ["Theme03", Theme03],
  ["Theme04", Theme04],
])("%s OAB line", (_name, Theme) => {
  it("shows the formatted OAB below the headline", () => {
    render(
      <Theme
        {...base}
        profile={{ publicName: "Dra. Ana", headline: "Advocacia de Família", oabNumber: "123456A", oabState: "SP" }}
      />
    )
    expect(screen.getByText("OAB/SP 123.456-A")).toBeInTheDocument()
  })

  it("renders nothing when the OAB is missing or incomplete", () => {
    render(<Theme {...base} profile={{ publicName: "Dra. Ana", headline: "x", oabNumber: "123456", oabState: null }} />)
    expect(screen.queryByText(/^OAB\//)).not.toBeInTheDocument()
  })
})

describe.each([
  ["Theme02", Theme02],
  ["Theme03", Theme03],
  ["Theme04", Theme04],
])("%s privacy link", (_name, Theme) => {
  const profile = { publicName: "Dra. Ana", headline: "x" }

  it("links to the privacy notice in the footer when privacyUrl is given", () => {
    render(<Theme {...base} profile={profile} privacyUrl="https://ana.advlink.site/privacidade" />)
    expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "https://ana.advlink.site/privacidade")
  })

  it("shows no link without privacyUrl (editor previews)", () => {
    render(<Theme {...base} profile={profile} />)
    expect(screen.queryByRole("link", { name: "Privacidade" })).not.toBeInTheDocument()
  })
})
