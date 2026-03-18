import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

// ---------------------------------------------------------------------------
// Mock Theme02 to avoid rendering the full theme tree in unit tests
// ---------------------------------------------------------------------------
vi.mock("@/components/themes/02/Theme02", () => ({
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
      data-testid="theme-02"
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

import Preview02 from "@/app/profile/edit/Preview02"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseProfile = {
  publicName: "Dr. João",
  primaryColor: "#1A1A2E",
  secondaryColor: "#E2E2E2",
  textColor: "#CCCCCC",
  coverUrl: "https://s3.example.com/cover.jpg",
  avatarUrl: "https://s3.example.com/avatar.jpg",
  whatsapp: "11999990000",
  publicEmail: "joao@adv.br",
  publicPhone: "11988880000",
  calendlyUrl: null,
  aboutDescription: "Advogado há 10 anos.",
  whatsappIsFixed: false,
  publicPhoneIsFixed: true,
}

const areas = [
  { id: "a1", title: "Direito Civil", description: "Atuação em civil.", coverImageUrl: null },
  { id: "a2", title: "Direito Trabalhista", description: null, coverImageUrl: null },
]

const address = {
  public: true,
  zipCode: "01310-100",
  street: "Av. Paulista",
  number: "1000",
  complement: null,
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Preview02", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Theme02 with the correct profile name", () => {
    render(<Preview02 profile={baseProfile} areas={areas} address={address} />)
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Dr. João")
  })

  it("passes the primaryColor from profile to Theme02", () => {
    render(<Preview02 profile={baseProfile} areas={areas} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-primary", "#1A1A2E")
  })

  it("passes the textColor from profile to Theme02", () => {
    render(<Preview02 profile={baseProfile} areas={areas} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-text", "#CCCCCC")
  })

  it("passes the secondaryColor from profile to Theme02", () => {
    render(<Preview02 profile={baseProfile} areas={areas} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-secondary", "#E2E2E2")
  })

  it("defaults primaryColor to #8B0000 when profile has no primaryColor", () => {
    const profileWithoutColors = { ...baseProfile, primaryColor: null }
    render(<Preview02 profile={profileWithoutColors} areas={[]} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-primary", "#8B0000")
  })

  it("defaults textColor to #FFFFFF when profile has no textColor", () => {
    const profileWithoutColors = { ...baseProfile, textColor: null }
    render(<Preview02 profile={profileWithoutColors} areas={[]} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-text", "#FFFFFF")
  })

  it("defaults secondaryColor to #FFFFFF when profile has no secondaryColor", () => {
    const profileWithoutColors = { ...baseProfile, secondaryColor: null }
    render(<Preview02 profile={profileWithoutColors} areas={[]} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-secondary", "#FFFFFF")
  })

  it("passes all areas down to Theme02", () => {
    render(<Preview02 profile={baseProfile} areas={areas} address={address} />)
    const areaTitles = screen.getAllByTestId("area-title")
    expect(areaTitles).toHaveLength(2)
    expect(areaTitles[0]).toHaveTextContent("Direito Civil")
    expect(areaTitles[1]).toHaveTextContent("Direito Trabalhista")
  })

  it("starts in desktop mode (forceMobile=false by default)", () => {
    render(<Preview02 profile={baseProfile} areas={[]} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-force-mobile", "false")
  })

  it("switches to mobile mode when Mobile button is clicked", async () => {
    const user = userEvent.setup()
    render(<Preview02 profile={baseProfile} areas={[]} address={address} />)
    const mobileBtn = screen.getByRole("button", { name: /mobile/i })
    await user.click(mobileBtn)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-force-mobile", "true")
  })

  it("switches back to desktop mode after clicking Desktop button", async () => {
    const user = userEvent.setup()
    render(<Preview02 profile={baseProfile} areas={[]} address={address} />)
    // First go to mobile
    await user.click(screen.getByRole("button", { name: /mobile/i }))
    // Then go back to desktop
    await user.click(screen.getByRole("button", { name: /desktop/i }))
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-force-mobile", "false")
  })

  it("passes constrainToContainer=true to Theme02", () => {
    render(<Preview02 profile={baseProfile} areas={[]} address={address} />)
    expect(screen.getByTestId("theme-02")).toHaveAttribute("data-constrain", "true")
  })

  it("renders the Desktop and Mobile toggle buttons", () => {
    render(<Preview02 profile={baseProfile} areas={[]} address={address} />)
    expect(screen.getByRole("button", { name: /desktop/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mobile/i })).toBeInTheDocument()
  })

  it("renders Theme02 without crashing when optional props are omitted", () => {
    render(<Preview02 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-02")).toBeInTheDocument()
  })
})
