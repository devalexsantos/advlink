import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { buildProfileJsonLd, jsonLdScript } from "@/lib/profile-jsonld"

const profile = {
  slug: "joao",
  publicName: "Dr. João Silva",
  headline: "Advogado trabalhista",
  avatarUrl: "https://cdn/x.jpg",
  publicPhone: "(11) 99999-9999",
  publicEmail: "joao@exemplo.com",
  instagramUrl: "https://instagram.com/joao",
}

describe("buildProfileJsonLd()", () => {
  beforeEach(() => vi.stubEnv("ROOT_DOMAIN", "advlink.site"))
  afterEach(() => vi.unstubAllEnvs())

  it("describes the profile as a LegalService on its canonical URL", () => {
    const data = buildProfileJsonLd(profile, null, ["Trabalhista", "Previdenciário"])
    expect(data).toMatchObject({
      "@type": "LegalService",
      name: "Dr. João Silva",
      url: "https://joao.advlink.site/",
      description: "Advogado trabalhista",
      image: "https://cdn/x.jpg",
      telephone: "(11) 99999-9999",
      sameAs: ["https://instagram.com/joao"],
      knowsAbout: ["Trabalhista", "Previdenciário"],
    })
    expect(data).not.toHaveProperty("aggregateRating")
    expect(data).not.toHaveProperty("review")
  })

  it("includes the address only when it is public", () => {
    const address = { public: true, street: "Rua A", number: "10", city: "São Paulo", state: "SP", zipCode: "01000-000" }
    expect(buildProfileJsonLd(profile, address, [])).toMatchObject({
      address: { streetAddress: "Rua A, 10", addressLocality: "São Paulo", addressRegion: "SP", addressCountry: "BR" },
      areaServed: { name: "São Paulo - SP" },
    })
    const hidden = buildProfileJsonLd(profile, { ...address, public: false }, [])
    expect(hidden).not.toHaveProperty("address")
    expect(hidden).not.toHaveProperty("areaServed")
  })
})

describe("jsonLdScript()", () => {
  it("escapes < so a value can't close the script tag", () => {
    const out = jsonLdScript({ name: "</script><script>alert(1)</script>" })
    expect(out).not.toContain("</script>")
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>")
  })
})
