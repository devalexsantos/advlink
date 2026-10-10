import { describe, it, expect } from "vitest"
import {
  UF_LIST,
  normalizeOabNumber,
  isValidUf,
  normalizeUf,
  formatOab,
  isValidPracticeType,
  parseOptionalOab,
} from "../oab"

describe("UF_LIST", () => {
  it("has the 27 UFs without duplicates", () => {
    expect(UF_LIST).toHaveLength(27)
    expect(new Set(UF_LIST).size).toBe(27)
    expect(UF_LIST).toContain("DF")
  })
})

describe("normalizeOabNumber", () => {
  it.each([
    ["123456", "123456"],
    ["123.456", "123456"],
    ["123 456", "123456"],
    ["123.456-a", "123456A"],
    ["123456A", "123456A"],
    ["1", "1"],
    [" 12.345 ", "12345"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeOabNumber(raw)).toBe(expected)
  })

  it.each(["", "   ", "1234567", "12AB", "A123", "12/34", "abc", "123456AB"])("rejects %j", (raw) => {
    expect(normalizeOabNumber(raw)).toBeNull()
  })

  it("rejects non-strings", () => {
    expect(normalizeOabNumber(null)).toBeNull()
    expect(normalizeOabNumber(123456)).toBeNull()
    expect(normalizeOabNumber(undefined)).toBeNull()
  })
})

describe("isValidUf / normalizeUf", () => {
  it("validates exact UFs", () => {
    expect(isValidUf("SP")).toBe(true)
    expect(isValidUf("sp")).toBe(false)
    expect(isValidUf("XX")).toBe(false)
    expect(isValidUf(undefined)).toBe(false)
  })

  it("normalizes case and whitespace", () => {
    expect(normalizeUf(" rj ")).toBe("RJ")
    expect(normalizeUf("ZZ")).toBeNull()
  })
})

describe("formatOab", () => {
  it("formats with thousands separator", () => {
    expect(formatOab("123456", "SP")).toBe("OAB/SP 123.456")
    expect(formatOab("1234", "RJ")).toBe("OAB/RJ 1.234")
    expect(formatOab("123", "MG")).toBe("OAB/MG 123")
  })

  it("preserves the suffix with a hyphen", () => {
    expect(formatOab("123456A", "SP")).toBe("OAB/SP 123.456-A")
    expect(formatOab("12a", "df")).toBe("OAB/DF 12-A")
  })

  it("returns null when something is missing or invalid", () => {
    expect(formatOab(null, "SP")).toBeNull()
    expect(formatOab("123456", null)).toBeNull()
    expect(formatOab("", "SP")).toBeNull()
    expect(formatOab("1234567", "SP")).toBeNull()
    expect(formatOab("123", "XX")).toBeNull()
  })
})

describe("isValidPracticeType", () => {
  it("accepts only the two values", () => {
    expect(isValidPracticeType("autonomo")).toBe(true)
    expect(isValidPracticeType("escritorio")).toBe(true)
    expect(isValidPracticeType("outro")).toBe(false)
    expect(isValidPracticeType(null)).toBe(false)
  })
})

describe("parseOptionalOab", () => {
  it("returns nothing for absent keys", () => {
    expect(parseOptionalOab({})).toEqual({ ok: true, data: {} })
  })

  it("normalizes valid values", () => {
    expect(parseOptionalOab({ oabNumber: "123.456-a", oabState: "sp" })).toEqual({
      ok: true,
      data: { oabNumber: "123456A", oabState: "SP" },
    })
  })

  it("treats empty string and null as clearing", () => {
    expect(parseOptionalOab({ oabNumber: "", oabState: null })).toEqual({
      ok: true,
      data: { oabNumber: null, oabState: null },
    })
  })

  it("rejects invalid number or UF", () => {
    expect(parseOptionalOab({ oabNumber: "abc" }).ok).toBe(false)
    expect(parseOptionalOab({ oabState: "XX" }).ok).toBe(false)
  })
})
