// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findFirst: vi.fn() },
    activityAreas: { findMany: vi.fn().mockResolvedValue([]) },
    links: { findMany: vi.fn().mockResolvedValue([]) },
    gallery: { findMany: vi.fn().mockResolvedValue([]) },
    customSection: { findMany: vi.fn().mockResolvedValue([]) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/components/themes/02/Theme02", () => ({ default: () => "Theme02" }))
vi.mock("@/components/themes/03/Theme03", () => ({ default: () => "Theme03" }))
vi.mock("@/components/themes/04/Theme04", () => ({ default: () => "Theme04" }))
vi.mock("@/components/analytics/ProfileTracker", () => ({ ProfileTracker: () => null }))
vi.mock("next/script", () => ({ default: () => null }))
vi.mock("next/link", () => ({ default: ({ children }: any) => children }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

// We test the server component by calling it as a function and inspecting the returned JSX
import PublicProfilePage from "@/app/adv/[slug]/page"

describe("Public Profile Page (/adv/[slug])", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("responds 404 (notFound) when profile does not exist", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    await expect(PublicProfilePage({ params: Promise.resolve({ slug: "naoexiste" }) })).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("links the inactive page to the app with absolute URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "teste", userId: "u1", isActive: false, address: null })
    const rendered = JSON.stringify(await PublicProfilePage({ params: Promise.resolve({ slug: "teste" }) }))
    expect(rendered).toContain("https://app.advlink.site/profile/edit")
    expect(rendered).toContain("https://app.advlink.site/login?utm_source=perfil_inativo")
    expect(rendered).not.toContain('"href":"/profile/edit"')
    vi.unstubAllEnvs()
  })

  it("falls back to the classic theme for unknown theme values", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: true, theme: null, address: null })
    const result = (await PublicProfilePage({ params: Promise.resolve({ slug: "x" }) })) as {
      props: { children: unknown[] }
    }
    // children: [gtm, tracker, modern, classic, corporate] — only the classic slot renders an element
    const themeSlots = result.props.children.slice(-3)
    expect(themeSlots.map((c) => Boolean(c))).toEqual([false, true, false])
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

describe("generateMetadata (/adv/[slug])", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
  })

  it("sets an absolute canonical and og:url on the profile subdomain", async () => {
    const { generateMetadata } = await import("@/app/adv/[slug]/page")
    prismaMock.profile.findFirst.mockResolvedValue({ publicName: "Dr. João", isActive: true, aboutDescription: "<p><strong>Sobre</strong> mim</p>" })
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "joao" }) })
    expect(meta.alternates?.canonical).toBe("https://joao.advlink.site/")
    expect((meta.openGraph as { url?: string }).url).toBe("https://joao.advlink.site/")
    expect(meta.description).toBe("Sobre mim")
    expect(meta.robots).toBeUndefined()
  })

  it("marks inactive profiles as noindex", async () => {
    const { generateMetadata } = await import("@/app/adv/[slug]/page")
    prismaMock.profile.findFirst.mockResolvedValue({ publicName: "Dr. João", isActive: false })
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "joao" }) })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it("marks missing profiles as noindex", async () => {
    const { generateMetadata } = await import("@/app/adv/[slug]/page")
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "nada" }) })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
})
