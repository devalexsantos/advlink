import { describe, it, expect, afterEach, vi } from "vitest"
import { getAppOrigin, getProfileHost, getProfileUrl, getRootDomain } from "@/lib/site-url"

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
})
