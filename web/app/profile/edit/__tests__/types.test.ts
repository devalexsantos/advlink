import { describe, it, expect } from "vitest"
import { profileEditSchema } from "@/app/profile/edit/types"

describe("profileEditSchema", () => {
  // ---- publicName ----------------------------------------------------------

  it("validates publicName with ≥2 chars", () => {
    const result = profileEditSchema.safeParse({ publicName: "Ab" })
    expect(result.success).toBe(true)
  })

  it("rejects publicName with <2 chars", () => {
    const result = profileEditSchema.safeParse({ publicName: "A" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe pelo menos 2 caracteres.")
    }
  })

  it("rejects empty publicName", () => {
    const result = profileEditSchema.safeParse({ publicName: "" })
    expect(result.success).toBe(false)
  })

  // ---- optional fields with empty string transform -------------------------

  it("accepts empty headline string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", headline: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty aboutDescription string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", aboutDescription: "" })
    expect(result.success).toBe(true)
  })

  it("accepts non-empty headline", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", headline: "Advogado" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.headline).toBe("Advogado")
    }
  })

  it("accepts aboutDescription up to 5000 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      aboutDescription: "x".repeat(5000),
    })
    expect(result.success).toBe(true)
  })

  it("rejects aboutDescription over 5000 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      aboutDescription: "x".repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  // ---- email ---------------------------------------------------------------

  it("validates email format", () => {
    const valid = profileEditSchema.safeParse({
      publicName: "Test",
      publicEmail: "user@example.com",
    })
    expect(valid.success).toBe(true)

    const invalid = profileEditSchema.safeParse({
      publicName: "Test",
      publicEmail: "not-an-email",
    })
    expect(invalid.success).toBe(false)
  })

  it("accepts empty publicEmail string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", publicEmail: "" })
    expect(result.success).toBe(true)
  })

  it("accepts valid email", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      publicEmail: "adv@escritorio.adv.br",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publicEmail).toBe("adv@escritorio.adv.br")
    }
  })

  // ---- optional phone/whatsapp/instagram/calendly --------------------------

  it("accepts empty publicPhone string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", publicPhone: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty whatsapp string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", whatsapp: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty instagramUrl string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", instagramUrl: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty calendlyUrl string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", calendlyUrl: "" })
    expect(result.success).toBe(true)
  })

  it("accepts non-empty instagramUrl", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      instagramUrl: "https://instagram.com/advogado",
    })
    expect(result.success).toBe(true)
  })

  // ---- SEO fields ----------------------------------------------------------

  it("rejects metaTitle over 80 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      metaTitle: "x".repeat(81),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Máximo de 80 caracteres.")
    }
  })

  it("accepts metaTitle with exactly 80 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      metaTitle: "x".repeat(80),
    })
    expect(result.success).toBe(true)
  })

  it("accepts empty metaTitle string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", metaTitle: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty metaDescription string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", metaDescription: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty keywords string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", keywords: "" })
    expect(result.success).toBe(true)
  })

  it("accepts empty gtmContainerId string (optional field)", () => {
    const result = profileEditSchema.safeParse({ publicName: "Test", gtmContainerId: "" })
    expect(result.success).toBe(true)
  })

  it("accepts non-empty gtmContainerId", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      gtmContainerId: "GTM-XXXXXX",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.gtmContainerId).toBe("GTM-XXXXXX")
  })

  // ---- address fields ------------------------------------------------------

  it("accepts all optional address fields", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      addressPublic: true,
      zipCode: "01000-000",
      street: "Rua Test",
      number: "123",
      city: "São Paulo",
      state: "SP",
    })
    expect(result.success).toBe(true)
  })

  it("accepts empty address string fields (all optional)", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    })
    expect(result.success).toBe(true)
  })

  it("accepts addressPublic as boolean", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      addressPublic: false,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.addressPublic).toBe(false)
  })

  // ---- full valid payload ---------------------------------------------------

  it("accepts a complete valid payload", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Dr. João Silva",
      headline: "Advogado Civilista",
      aboutDescription: "Atuo em direito civil há 10 anos.",
      publicEmail: "joao@silva.adv.br",
      publicPhone: "11999990000",
      whatsapp: "11999990001",
      instagramUrl: "https://instagram.com/joaosilva",
      calendlyUrl: "https://calendly.com/joao",
      metaTitle: "Dr. João Silva - Advogado",
      metaDescription: "Escritório especializado em direito civil.",
      keywords: "advogado, civil, sp",
      gtmContainerId: "GTM-ABC123",
      addressPublic: true,
      zipCode: "01310-100",
      street: "Av. Paulista",
      number: "1000",
      complement: "Sala 10",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    })
    expect(result.success).toBe(true)
  })
})
