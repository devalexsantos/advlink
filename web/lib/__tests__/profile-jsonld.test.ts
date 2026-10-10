import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { buildFaqJsonLd, buildProfileJsonLd, jsonLdScript } from "@/lib/profile-jsonld"

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

  it("adds the OAB registration as an identifier when complete", () => {
    expect(buildProfileJsonLd({ ...profile, oabNumber: "123456A", oabState: "sp" }, null, [])).toMatchObject({
      identifier: { "@type": "PropertyValue", propertyID: "OAB/SP", value: "123456A" },
    })
  })

  it("omits the identifier when the OAB is missing or incomplete", () => {
    expect(buildProfileJsonLd(profile, null, [])).not.toHaveProperty("identifier")
    expect(buildProfileJsonLd({ ...profile, oabNumber: "123456", oabState: null }, null, [])).not.toHaveProperty("identifier")
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

describe("buildProfileJsonLd() — networks, firm and languages", () => {
  beforeEach(() => vi.stubEnv("ROOT_DOMAIN", "advlink.site"))
  afterEach(() => vi.unstubAllEnvs())

  it("lists every filled social profile in sameAs", () => {
    const data = buildProfileJsonLd(
      { ...profile, linkedinUrl: "https://linkedin.com/in/joao", facebookUrl: null, youtubeUrl: "https://youtu.be/x" },
      null,
      [],
    )
    expect(data.sameAs).toEqual(["https://instagram.com/joao", "https://linkedin.com/in/joao", "https://youtu.be/x"])
  })

  it("omits sameAs when no network is filled", () => {
    expect(buildProfileJsonLd({ ...profile, instagramUrl: null }, null, [])).not.toHaveProperty("sameAs")
  })

  it("adds the firm as parentOrganization with formatted CNPJ and OAB registration", () => {
    const data = buildProfileJsonLd(
      { ...profile, firmName: "Silva Advogados", firmType: "sociedade", firmCnpj: "11222333000181", firmOabRegistration: "OAB/SP 12.345" },
      null,
      [],
    )
    expect(data.parentOrganization).toEqual({
      "@type": "LegalService",
      name: "Silva Advogados",
      taxID: "11.222.333/0001-81",
      identifier: { "@type": "PropertyValue", propertyID: "OAB", value: "OAB/SP 12.345" },
    })
    expect(data.name).toBe("Dr. João Silva")
  })

  it("omits taxID/identifier when missing and parentOrganization without firmName", () => {
    expect(buildProfileJsonLd({ ...profile, firmName: "Silva Advogados" }, null, []).parentOrganization).toEqual({
      "@type": "LegalService",
      name: "Silva Advogados",
    })
    expect(buildProfileJsonLd({ ...profile, firmCnpj: "11222333000181" }, null, [])).not.toHaveProperty("parentOrganization")
  })

  it("splits languages by comma and ' e '", () => {
    expect(buildProfileJsonLd({ ...profile, languages: "Português, Inglês e Espanhol" }, null, []).knowsLanguage).toEqual([
      "Português",
      "Inglês",
      "Espanhol",
    ])
    expect(buildProfileJsonLd({ ...profile, languages: "  " }, null, [])).not.toHaveProperty("knowsLanguage")
  })
})

describe("buildFaqJsonLd()", () => {
  it("returns null when no area has FAQs", () => {
    expect(buildFaqJsonLd([])).toBeNull()
    expect(buildFaqJsonLd([{ faqs: [] }, {}, { faqs: null }])).toBeNull()
    expect(buildFaqJsonLd([{ faqs: [{ question: " ", answer: "x" }] }])).toBeNull()
  })

  it("builds a FAQPage with every area's questions in order, as plain text", () => {
    const data = buildFaqJsonLd([
      { faqs: [{ question: "O que é inventário?", answer: "<p>É a partilha de bens.</p>" }] },
      { faqs: [{ question: "Q2?", answer: "A2." }] },
    ])
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "O que é inventário?", acceptedAnswer: { "@type": "Answer", text: "É a partilha de bens." } },
        { "@type": "Question", name: "Q2?", acceptedAnswer: { "@type": "Answer", text: "A2." } },
      ],
    })
  })
})
