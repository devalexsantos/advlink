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
vi.mock("@/components/analytics/GtmConsent", () => ({ GtmConsent: () => null }))
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

// We test the server component by calling it as a function and inspecting the returned JSX.
// Active profiles render <PublicProfileView>, a sync server component: expand it one level.
import Page from "@/app/adv/[slug]/page"
import { GtmConsent } from "@/components/analytics/GtmConsent"
import PublicProfileView from "@/app/adv/[slug]/PublicProfileView"

async function PublicProfilePage(args: Parameters<typeof Page>[0]) {
  const el = (await Page(args)) as { type?: unknown; props?: unknown }
  return el?.type === PublicProfileView ? PublicProfileView(el.props as Parameters<typeof PublicProfileView>[0]) : el
}

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

  it("emits LegalService JSON-LD for active profiles", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({
      id: "p1", slug: "joao", userId: "u1", isActive: true, theme: "classic", publicName: "Dr. João", address: null,
    })
    prismaMock.activityAreas.findMany.mockResolvedValueOnce([{ title: "Trabalhista" }])
    const rendered = JSON.stringify(await PublicProfilePage({ params: Promise.resolve({ slug: "joao" }) }))
    expect(rendered).toContain("application/ld+json")
    expect(rendered).toContain("LegalService")
    expect(rendered).toContain("Trabalhista")
  })

  it("emits a FAQPage JSON-LD only when an area has FAQs", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({
      id: "p1", slug: "joao", userId: "u1", isActive: true, theme: "classic", publicName: "Dr. João", address: null,
    })
    prismaMock.activityAreas.findMany.mockResolvedValueOnce([
      { title: "Sucessões", faqs: [{ id: "f1", question: "O que é inventário?", answer: "É a partilha de bens.", position: 0 }] },
    ])
    const withFaq = JSON.stringify(await PublicProfilePage({ params: Promise.resolve({ slug: "joao" }) }))
    expect(withFaq).toContain("FAQPage")
    expect(withFaq).toContain("O que é inventário?")
    expect(prismaMock.activityAreas.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: "p1" },
        include: { faqs: { orderBy: { position: "asc" }, select: { id: true, question: true, answer: true, position: true } } },
      }),
    )

    prismaMock.activityAreas.findMany.mockResolvedValueOnce([{ title: "Sucessões", faqs: [] }])
    const withoutFaq = JSON.stringify(await PublicProfilePage({ params: Promise.resolve({ slug: "joao" }) }))
    expect(withoutFaq).toContain("LegalService")
    expect(withoutFaq).not.toContain("FAQPage")
  })

  it("falls back to the classic theme for unknown theme values", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: true, theme: null, address: null })
    const result = (await PublicProfilePage({ params: Promise.resolve({ slug: "x" }) })) as {
      props: { children: unknown[] }
    }
    // children: [banner, json-ld, faq json-ld, gtm, tracker, modern, classic, corporate] — only the classic slot renders an element
    const themeSlots = result.props.children.slice(-3)
    expect(themeSlots.map((c) => Boolean(c))).toEqual([false, true, false])
  })

  it("renders the published site with tracker and the profile's GTM container", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: true, theme: "classic", gtmContainerId: "GTM-ABCD123", address: null })
    const el = (await Page({ params: Promise.resolve({ slug: "x" }) })) as { type: unknown; props: Record<string, unknown> }
    expect(el.type).toBe(PublicProfileView)
    expect(el.props).toMatchObject({ slug: "x", showTracker: true, gtmContainerId: "GTM-ABCD123" })
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith({ where: { slug: "x" }, include: { address: true } })
    expect(prismaMock.teamMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { profileId: "p1" } }))
  })

  it("gates GTM behind GtmConsent and points to the subdomain's privacy notice", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: true, theme: "classic", gtmContainerId: "GTM-ABCD123", address: null })
    const result = (await PublicProfilePage({ params: Promise.resolve({ slug: "x" }) })) as { props: { children: Array<{ type?: unknown; props?: Record<string, unknown> } | false | null> } }
    const consent = result.props.children.find((c) => c && c.type === GtmConsent) as { props: Record<string, unknown> } | undefined
    expect(consent?.props).toMatchObject({ gtmContainerId: "GTM-ABCD123", privacyUrl: "https://x.advlink.site/privacidade" })
  })

  it("does not render GtmConsent without a valid container", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: true, theme: "classic", gtmContainerId: "bad'id", address: null })
    const result = (await PublicProfilePage({ params: Promise.resolve({ slug: "x" }) })) as { props: { children: Array<{ type?: unknown } | false | null> } }
    expect(result.props.children.some((c) => c && c.type === GtmConsent)).toBe(false)
  })

  it("does not load the site's content for an inactive profile", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", slug: "x", userId: "u1", isActive: false, address: null })
    await PublicProfilePage({ params: Promise.resolve({ slug: "x" }) })
    expect(prismaMock.activityAreas.findMany).not.toHaveBeenCalled()
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
