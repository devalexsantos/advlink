// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, loadPublicProfileMock } = vi.hoisted(() => ({
  prismaMock: { previewLink: { findUnique: vi.fn() } },
  loadPublicProfileMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/public-profile", () => ({ loadPublicProfile: loadPublicProfileMock }))
vi.mock("@/components/themes/02/Theme02", () => ({ default: () => "Theme02" }))
vi.mock("@/components/themes/03/Theme03", () => ({ default: () => "Theme03" }))
vi.mock("@/components/themes/04/Theme04", () => ({ default: () => "Theme04" }))
vi.mock("@/components/analytics/ProfileTracker", () => ({ ProfileTracker: () => null }))
vi.mock("next/script", () => ({ default: () => null }))

import PreviewPage, { generateMetadata } from "@/app/previa/[token]/page"
import PublicProfileView from "@/app/adv/[slug]/PublicProfileView"

const TOKEN = "a".repeat(32)
const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) })
const future = () => new Date(Date.now() + 60_000)

const data = (profile: Record<string, unknown> = {}) => ({
  profile: { id: "p1", slug: "joao", isActive: false, theme: "classic", gtmContainerId: "GTM-ABCD123", address: null, ...profile },
  areas: [],
  links: [],
  gallery: [],
  customSections: [],
  teamMembers: [],
})

type El = { type?: unknown; props: Record<string, unknown> }

/** Renders sync function components recursively so the JSX tree can be inspected as data. */
function expand(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(expand)
  if (!node || typeof node !== "object" || !("props" in node)) return node
  const el = node as El
  if (typeof el.type === "function") return expand((el.type as (p: unknown) => unknown)(el.props))
  return { ...el, props: { ...el.props, children: expand(el.props.children) } }
}
const render = async (p: ReturnType<typeof params>) => JSON.stringify(expand(await PreviewPage(p)))

describe("Preview page (/previa/[token])", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ROOT_DOMAIN", "advlink.site")
  })

  it("shows the expired page for a missing token", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue(null)
    const rendered = await render(params())
    expect(rendered).toContain("Esta prévia expirou ou não existe")
    expect(loadPublicProfileMock).not.toHaveBeenCalled()
  })

  it("shows the expired page for an expired link", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue({
      profileId: "p1", expiresAt: new Date(Date.now() - 1000), profile: { publicName: "X", suspendedByAdmin: false },
    })
    const rendered = await render(params())
    expect(rendered).toContain("Esta prévia expirou ou não existe")
    expect(loadPublicProfileMock).not.toHaveBeenCalled()
  })

  it("does not query the database for malformed tokens", async () => {
    const rendered = await render(params("bad token!"))
    expect(rendered).toContain("Esta prévia expirou ou não existe")
    expect(prismaMock.previewLink.findUnique).not.toHaveBeenCalled()
  })

  it("hides sites suspended by the admin", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue({ profileId: "p1", expiresAt: future(), profile: { publicName: "X", suspendedByAdmin: true } })
    expect(await render(params())).toContain("Esta prévia expirou ou não existe")
  })

  it("renders the unpublished site without tracker or GTM, with the preview strip", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue({ profileId: "p1", expiresAt: future(), profile: { publicName: "X", suspendedByAdmin: false } })
    loadPublicProfileMock.mockResolvedValue(data())
    const el = (await PreviewPage(params())) as El
    expect(loadPublicProfileMock).toHaveBeenCalledWith({ id: "p1" })
    expect(el.type).toBe(PublicProfileView)
    expect(el.props).toMatchObject({ showTracker: false, gtmContainerId: null, slug: "joao" })

    const view = expand(el) as El
    const rendered = JSON.stringify(view)
    expect(rendered).toContain("Prévia — este site ainda não foi publicado")
    expect(rendered).not.toContain("GTM-ABCD123")
    const children = view.props.children as unknown[]
    // [banner, json-ld, gtm, tracker, modern, classic, corporate]
    expect(children[2]).toBeFalsy()
    expect(children[3]).toBeFalsy()
    expect(children.slice(-3).map(Boolean)).toEqual([false, true, false])
  })

  it("points to the live site when it is already published", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue({ profileId: "p1", expiresAt: future(), profile: { publicName: "X", suspendedByAdmin: false } })
    loadPublicProfileMock.mockResolvedValue(data({ isActive: true }))
    const rendered = await render(params())
    expect(rendered).toContain("https://joao.advlink.site/")
    expect(rendered).not.toContain("ainda não foi publicado")
  })

  it("is always noindex/nofollow and never sends the token as referrer", async () => {
    prismaMock.previewLink.findUnique.mockResolvedValue({ profileId: "p1", expiresAt: future(), profile: { publicName: "Dra. Ana", suspendedByAdmin: false } })
    const meta = await generateMetadata(params())
    expect(meta.robots).toEqual({ index: false, follow: false })
    expect(meta.referrer).toBe("no-referrer")
    expect(meta.title).toContain("Dra. Ana")

    prismaMock.previewLink.findUnique.mockResolvedValue(null)
    const missing = await generateMetadata(params("b".repeat(32)))
    expect(missing.robots).toEqual({ index: false, follow: false })
  })
})
