// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const { prismaMock } = vi.hoisted(() => ({ prismaMock: { profile: { findFirst: vi.fn() } } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

import Page, { generateMetadata } from "../page"

const params = Promise.resolve({ slug: "ana" })
const base = {
  id: "p1", slug: "ana", isActive: true, publicName: "Dra. Ana Souza", oabNumber: "123456", oabState: "SP",
  publicEmail: "ana@exemplo.com", gtmContainerId: null,
  address: { public: true, street: "Rua A", number: "10", city: "São Paulo", state: "SP" },
}

async function html() {
  return renderToStaticMarkup(await Page({ params }))
}

describe("Privacy notice (/adv/[slug]/privacidade)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("responds 404 when the profile does not exist", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    await expect(Page({ params })).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("renders the notice with the lawyer's data, even when the site is inactive", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ ...base, isActive: false })
    const out = await html()
    expect(out).toContain("Dra. Ana Souza")
    expect(out).toContain("OAB/SP 123.456")
    expect(out).toContain("ana@exemplo.com")
    expect(out).toContain("Rua A, 10")
    expect(out).toContain("49.957.258/0001-70")
    expect(out).toContain("Voltar ao site")
  })

  it("hides the address when it is private and omits the cookie section without GTM", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ ...base, address: { ...base.address, public: false } })
    const out = await html()
    expect(out).not.toContain("Rua A")
    expect(out).not.toContain("Alterar minha escolha de cookies")
  })

  it("offers to change the cookie choice when GTM is configured", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ ...base, gtmContainerId: "GTM-ABCD123" })
    expect(await html()).toContain("Alterar minha escolha de cookies")
  })

  it("is noindex with the lawyer's name in the title", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ publicName: "Dra. Ana Souza" })
    const meta = await generateMetadata({ params })
    expect(meta.title).toBe("Aviso de privacidade — Dra. Ana Souza")
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
})
