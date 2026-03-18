// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findFirst: vi.fn() },
    activityAreas: { findMany: vi.fn().mockResolvedValue([]) },
    links: { findMany: vi.fn().mockResolvedValue([]) },
    gallery: { findMany: vi.fn().mockResolvedValue([]) },
    customSection: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/components/themes/02/Theme02", () => ({ default: () => "Theme02" }))
vi.mock("@/components/themes/03/Theme03", () => ({ default: () => "Theme03" }))
vi.mock("@/components/themes/04/Theme04", () => ({ default: () => "Theme04" }))
vi.mock("@/components/analytics/ProfileTracker", () => ({ ProfileTracker: () => null }))
vi.mock("next/script", () => ({ default: () => null }))
vi.mock("next/link", () => ({ default: ({ children }: any) => children }))

// We test the server component by calling it as a function and inspecting the returned JSX
import PublicProfilePage from "@/app/adv/[slug]/page"

describe("Public Profile Page (/adv/[slug])", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows 'Perfil não encontrado' when profile does not exist", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const result = await PublicProfilePage({ params: Promise.resolve({ slug: "naoexiste" }) })

    // Server component returns JSX - serialize to check content
    const rendered = JSON.stringify(result)
    expect(rendered).toContain("Perfil não encontrado")
  })

  it("shows 'Esta página está inativa' when profile is not active", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({
      id: "p1",
      slug: "teste",
      userId: "u1",
      isActive: false,
      address: null,
    })

    const result = await PublicProfilePage({ params: Promise.resolve({ slug: "teste" }) })
    const rendered = JSON.stringify(result)
    expect(rendered).toContain("Esta página está inativa")
    expect(rendered).toContain("publique sua página")
  })

  it("renders the profile theme when profile IS active", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({
      id: "p1",
      slug: "ativo",
      userId: "u1",
      isActive: true,
      theme: "classic",
      primaryColor: "#000",
      textColor: "#FFF",
      secondaryColor: "#EEE",
      sectionOrder: null,
      sectionLabels: null,
      sectionIcons: null,
      sectionTitleHidden: null,
      gtmContainerId: null,
      address: null,
    })

    const result = await PublicProfilePage({ params: Promise.resolve({ slug: "ativo" }) })
    const rendered = JSON.stringify(result)

    // Should NOT show inactive message
    expect(rendered).not.toContain("Esta página está inativa")
    expect(rendered).not.toContain("Perfil não encontrado")
  })

  it("does not render theme content for inactive profile", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({
      id: "p1",
      slug: "inativo",
      userId: "u1",
      isActive: false,
      theme: "modern",
      address: null,
    })

    const result = await PublicProfilePage({ params: Promise.resolve({ slug: "inativo" }) })
    const rendered = JSON.stringify(result)

    // Should show inactive, not the profile
    expect(rendered).toContain("Esta página está inativa")
  })
})
