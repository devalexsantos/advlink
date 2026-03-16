import { describe, it, expect } from "vitest"
import { CURATED_ICONS } from "@/lib/curated-icons"

describe("CURATED_ICONS", () => {
  it("is a non-empty array", () => {
    expect(CURATED_ICONS.length).toBeGreaterThan(0)
  })

  it("contains expected legal/law icons", () => {
    expect(CURATED_ICONS).toContain("Scale")
    expect(CURATED_ICONS).toContain("Gavel")
    expect(CURATED_ICONS).toContain("Landmark")
  })

  it("contains expected business icons", () => {
    expect(CURATED_ICONS).toContain("Briefcase")
    expect(CURATED_ICONS).toContain("Building")
  })

  it("has no duplicates", () => {
    const unique = new Set(CURATED_ICONS)
    expect(unique.size).toBe(CURATED_ICONS.length)
  })
})
