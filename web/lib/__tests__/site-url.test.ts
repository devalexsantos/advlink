import { describe, it, expect, afterEach, vi } from "vitest"
import { activeHostOf, getAppOrigin, getProfileHost, getProfileUrl, getRootDomain, getSiteUrl } from "@/lib/site-url"

describe("site-url", () => {
  afterEach(() => vi.unstubAllEnvs())

  function env(vars: Record<string, string>) {
    for (const k of ["NEXT_PUBLIC_ROOT_DOMAIN", "ROOT_DOMAIN", "NEXT_PUBLIC_APP_ORIGIN", "NEXTAUTH_URL"]) vi.stubEnv(k, "")
    for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
  }

  it("defaults to advlink.site over https", () => {
    env({})
    expect(getRootDomain()).toBe("advlink.site")
    expect(getProfileUrl("joao")).toBe("https://joao.advlink.site/")
    expect(getProfileHost("joao")).toBe("joao.advlink.site")
    expect(getAppOrigin()).toBe("https://app.advlink.site")
  })

  it("prefers NEXT_PUBLIC_ROOT_DOMAIN, then ROOT_DOMAIN", () => {
    env({ ROOT_DOMAIN: "staging.advlink.site" })
    expect(getProfileUrl("a")).toBe("https://a.staging.advlink.site/")
    env({ ROOT_DOMAIN: "x.site", NEXT_PUBLIC_ROOT_DOMAIN: "y.site" })
    expect(getRootDomain()).toBe("y.site")
  })

  it("uses http for localhost roots", () => {
    env({ ROOT_DOMAIN: "localhost:3000" })
    expect(getProfileUrl("joao")).toBe("http://joao.localhost:3000/")
    expect(getAppOrigin()).toBe("http://app.localhost:3000")
  })

  it("uses the configured app origin without trailing slash", () => {
    env({ NEXT_PUBLIC_APP_ORIGIN: "https://app.advlink.site/" })
    expect(getAppOrigin()).toBe("https://app.advlink.site")
    env({ NEXTAUTH_URL: "https://app.example.com" })
    expect(getAppOrigin()).toBe("https://app.example.com")
  })

  it("getSiteUrl prefers the custom domain (always https)", () => {
    env({ ROOT_DOMAIN: "localhost:3000" })
    expect(getSiteUrl({ slug: "joao", customDomainHost: "escritorio.adv.br" })).toBe("https://escritorio.adv.br/")
    expect(getSiteUrl({ slug: "joao", customDomainHost: null })).toBe("http://joao.localhost:3000/")
    expect(getSiteUrl({ slug: "joao" })).toBe("http://joao.localhost:3000/")
  })

  it("activeHostOf returns the host only for active domains", () => {
    expect(activeHostOf({ host: "a.com.br", status: "active" })).toBe("a.com.br")
    expect(activeHostOf({ host: "a.com.br", status: "provisioning" })).toBeNull()
    expect(activeHostOf(null)).toBeNull()
    expect(activeHostOf(undefined)).toBeNull()
  })
})
