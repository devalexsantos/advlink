import { describe, it, expect } from "vitest"
import { formatCnpj, isValidCnpj, normalizeCnpj } from "../cnpj"

describe("cnpj", () => {
  it("validates check digits", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true)
    expect(isValidCnpj("11222333000181")).toBe(true)
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false)
  })

  it("rejects wrong lengths and repeated digits", () => {
    expect(isValidCnpj("1122233300018")).toBe(false)
    expect(isValidCnpj("00000000000000")).toBe(false)
    expect(isValidCnpj("")).toBe(false)
    expect(isValidCnpj(null)).toBe(false)
  })

  it("normalizes and formats", () => {
    expect(normalizeCnpj("11.222.333/0001-81")).toBe("11222333000181")
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81")
    expect(formatCnpj("123")).toBe("123")
  })
})
