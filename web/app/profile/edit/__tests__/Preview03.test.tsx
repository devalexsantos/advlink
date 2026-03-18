import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

// ---------------------------------------------------------------------------
// Mock Theme03 to avoid rendering the full theme tree
// ---------------------------------------------------------------------------
vi.mock("@/components/themes/03/Theme03", () => ({
  default: ({
    profile,
    areas,
    primary,
    text,
    secondary,
    forceMobile,
    constrainToContainer,
  }: {
    profile: { publicName?: string | null }
    areas: { id: string; title: string }[]
    primary: string
    text: string
    secondary: string
    forceMobile?: boolean
    constrainToContainer?: boolean
  }) => (
    <div
      data-testid="theme-03"
      data-primary={primary}
      data-text={text}
      data-secondary={secondary}
      data-force-mobile={String(forceMobile ?? false)}
      data-constrain={String(constrainToContainer ?? false)}
    >
      <span data-testid="profile-name">{profile.publicName}</span>
      {areas.map((a) => (
        <span key={a.id} data-testid="area-title">{a.title}</span>
      ))}
    </div>
  ),
}))

import Preview03 from "@/app/profile/edit/Preview03"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseProfile = {
  publicName: "Dra. Beatriz",
  primaryColor: "#2C2C54",
  secondaryColor: "#F5F5F5",
  textColor: "#222222",
  coverUrl: null,
  avatarUrl: null,
  whatsapp: "11999990001",
  publicEmail: "beatriz@adv.br",
  publicPhone: null,
  calendlyUrl: "https://calendly.com/beatriz",
  aboutDescription: "Especialista em família e sucessões.",
  whatsappIsFixed: true,
  publicPhoneIsFixed: false,
}

const areas = [
  { id: "a1", title: "Direito de Família", description: "Divórcio, guarda, etc.", coverImageUrl: null },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Preview03", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Theme03 with the profile name", () => {
    render(<Preview03 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Dra. Beatriz")
  })

  it("passes primaryColor to Theme03", () => {
    render(<Preview03 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-primary", "#2C2C54")
  })

  it("passes textColor to Theme03", () => {
    render(<Preview03 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-text", "#222222")
  })

  it("passes secondaryColor to Theme03", () => {
    render(<Preview03 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-secondary", "#F5F5F5")
  })

  it("defaults primaryColor to #8B0000 when profile has no primaryColor", () => {
    render(<Preview03 profile={{ ...baseProfile, primaryColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-primary", "#8B0000")
  })

  it("defaults textColor to #FFFFFF when profile has no textColor", () => {
    render(<Preview03 profile={{ ...baseProfile, textColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-text", "#FFFFFF")
  })

  it("defaults secondaryColor to #FFFFFF when profile has no secondaryColor", () => {
    render(<Preview03 profile={{ ...baseProfile, secondaryColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-secondary", "#FFFFFF")
  })

  it("passes areas to Theme03", () => {
    render(<Preview03 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("area-title")).toHaveTextContent("Direito de Família")
  })

  it("starts in desktop mode", () => {
    render(<Preview03 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-force-mobile", "false")
  })

  it("switches to mobile mode when Mobile button is clicked", async () => {
    const user = userEvent.setup()
    render(<Preview03 profile={baseProfile} areas={[]} />)
    await user.click(screen.getByRole("button", { name: /mobile/i }))
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-force-mobile", "true")
  })

  it("switches back to desktop mode when Desktop button is clicked", async () => {
    const user = userEvent.setup()
    render(<Preview03 profile={baseProfile} areas={[]} />)
    await user.click(screen.getByRole("button", { name: /mobile/i }))
    await user.click(screen.getByRole("button", { name: /desktop/i }))
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-force-mobile", "false")
  })

  it("passes constrainToContainer=true to Theme03", () => {
    render(<Preview03 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toHaveAttribute("data-constrain", "true")
  })

  it("renders Desktop and Mobile toggle buttons", () => {
    render(<Preview03 profile={baseProfile} areas={[]} />)
    expect(screen.getByRole("button", { name: /desktop/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mobile/i })).toBeInTheDocument()
  })

  it("renders without crashing when optional props are omitted", () => {
    render(<Preview03 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-03")).toBeInTheDocument()
  })
})
