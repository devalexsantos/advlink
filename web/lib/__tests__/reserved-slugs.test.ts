import { describe, it, expect } from "vitest"
import { RESERVED_SLUGS, isReservedSlug } from "@/lib/reserved-slugs"

describe("RESERVED_SLUGS", () => {
  it("contains expected values", () => {
    expect(RESERVED_SLUGS.has("admin")).toBe(true)
    expect(RESERVED_SLUGS.has("api")).toBe(true)
    expect(RESERVED_SLUGS.has("www")).toBe(true)
    expect(RESERVED_SLUGS.has("advlink")).toBe(true)
    expect(RESERVED_SLUGS.has("adv")).toBe(true)
  })

  it("is a non-empty Set", () => {
    expect(RESERVED_SLUGS.size).toBeGreaterThan(0)
  })
})

describe("isReservedSlug()", () => {
  it("returns true for reserved slugs", () => {
    expect(isReservedSlug("admin")).toBe(true)
    expect(isReservedSlug("api")).toBe(true)
    expect(isReservedSlug("dashboard")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isReservedSlug("Admin")).toBe(true)
    expect(isReservedSlug("API")).toBe(true)
    expect(isReservedSlug("ADVLINK")).toBe(true)
  })

  it("returns false for non-reserved slugs", () => {
    expect(isReservedSlug("john-doe")).toBe(false)
    expect(isReservedSlug("my-profile")).toBe(false)
    expect(isReservedSlug("lawyer123")).toBe(false)
  })
})
