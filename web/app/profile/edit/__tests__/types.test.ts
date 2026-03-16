import { describe, it, expect } from "vitest"
import { profileEditSchema } from "@/app/profile/edit/types"

describe("profileEditSchema", () => {
  it("validates publicName with ≥2 chars", () => {
    const result = profileEditSchema.safeParse({ publicName: "Ab" })
    expect(result.success).toBe(true)
  })

  it("rejects publicName with <2 chars", () => {
    const result = profileEditSchema.safeParse({ publicName: "A" })
    expect(result.success).toBe(false)
  })

  it("accepts empty string fields (optional transform)", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      headline: "",
      aboutDescription: "",
    })
    expect(result.success).toBe(true)
  })

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

  it("rejects metaTitle over 80 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      metaTitle: "x".repeat(81),
    })
    expect(result.success).toBe(false)
  })

  it("accepts metaTitle with 80 chars", () => {
    const result = profileEditSchema.safeParse({
      publicName: "Test",
      metaTitle: "x".repeat(80),
    })
    expect(result.success).toBe(true)
  })

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
})
