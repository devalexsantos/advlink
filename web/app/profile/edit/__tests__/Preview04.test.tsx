import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

// ---------------------------------------------------------------------------
// Mock Theme04 to avoid rendering the full theme tree
// ---------------------------------------------------------------------------
vi.mock("@/components/themes/04/Theme04", () => ({
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
      data-testid="theme-04"
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

import Preview04 from "@/app/profile/edit/Preview04"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseProfile = {
  publicName: "Dr. Carlos Mendes",
  primaryColor: "#003366",
  secondaryColor: "#D4AF37",
  textColor: "#F0F0F0",
  coverUrl: "https://s3.example.com/cover-corp.jpg",
  avatarUrl: "https://s3.example.com/avatar-corp.jpg",
  whatsapp: "11988770000",
  publicEmail: "carlos@mendes.adv.br",
  publicPhone: "1133334444",
  calendlyUrl: null,
  aboutDescription: "Especialista em direito empresarial.",
  whatsappIsFixed: false,
  publicPhoneIsFixed: true,
}

const areas = [
  { id: "a1", title: "Direito Empresarial", description: "M&A, contratos, compliance.", coverImageUrl: null },
  { id: "a2", title: "Direito Tributário", description: null, coverImageUrl: null },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Preview04", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Theme04 with the profile name", () => {
    render(<Preview04 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Dr. Carlos Mendes")
  })

  it("passes primaryColor to Theme04", () => {
    render(<Preview04 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-primary", "#003366")
  })

  it("passes textColor to Theme04", () => {
    render(<Preview04 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-text", "#F0F0F0")
  })

  it("passes secondaryColor to Theme04", () => {
    render(<Preview04 profile={baseProfile} areas={areas} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-secondary", "#D4AF37")
  })

  it("defaults primaryColor to #8B0000 when profile has no primaryColor", () => {
    render(<Preview04 profile={{ ...baseProfile, primaryColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-primary", "#8B0000")
  })

  it("defaults textColor to #FFFFFF when profile has no textColor", () => {
    render(<Preview04 profile={{ ...baseProfile, textColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-text", "#FFFFFF")
  })

  it("defaults secondaryColor to #FFFFFF when profile has no secondaryColor", () => {
    render(<Preview04 profile={{ ...baseProfile, secondaryColor: null }} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-secondary", "#FFFFFF")
  })

  it("passes all areas to Theme04", () => {
    render(<Preview04 profile={baseProfile} areas={areas} />)
    const titles = screen.getAllByTestId("area-title")
    expect(titles).toHaveLength(2)
    expect(titles[0]).toHaveTextContent("Direito Empresarial")
    expect(titles[1]).toHaveTextContent("Direito Tributário")
  })

  it("starts in desktop mode (forceMobile=false)", () => {
    render(<Preview04 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-force-mobile", "false")
  })

  it("switches to mobile mode when Mobile button is clicked", async () => {
    const user = userEvent.setup()
    render(<Preview04 profile={baseProfile} areas={[]} />)
    await user.click(screen.getByRole("button", { name: /mobile/i }))
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-force-mobile", "true")
  })

  it("switches back to desktop when Desktop button is clicked", async () => {
    const user = userEvent.setup()
    render(<Preview04 profile={baseProfile} areas={[]} />)
    await user.click(screen.getByRole("button", { name: /mobile/i }))
    await user.click(screen.getByRole("button", { name: /desktop/i }))
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-force-mobile", "false")
  })

  it("passes constrainToContainer=true to Theme04", () => {
    render(<Preview04 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toHaveAttribute("data-constrain", "true")
  })

  it("renders Desktop and Mobile toggle buttons", () => {
    render(<Preview04 profile={baseProfile} areas={[]} />)
    expect(screen.getByRole("button", { name: /desktop/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mobile/i })).toBeInTheDocument()
  })

  it("renders without crashing when optional link, gallery, sectionOrder props are omitted", () => {
    render(<Preview04 profile={baseProfile} areas={[]} />)
    expect(screen.getByTestId("theme-04")).toBeInTheDocument()
  })

  it("renders with links, gallery, and customSections passed through", () => {
    const links = [{ id: "l1", title: "Website", description: null, url: "https://example.com" }]
    const gallery = [{ id: "g1", coverImageUrl: null }]
    const customSections = [{ id: "cs1", title: "Publicações", description: null, imageUrl: null, layout: "text-only" as const, iconName: "FileText" }]
    render(
      <Preview04
        profile={baseProfile}
        areas={[]}
        links={links}
        gallery={gallery}
        customSections={customSections}
        sectionOrder={["servicos", "sobre"]}
        sectionLabels={{ servicos: "Serviços" }}
      />
    )
    expect(screen.getByTestId("theme-04")).toBeInTheDocument()
  })
})
