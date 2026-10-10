import { describe, it, expect } from "vitest"
import { buildWhatsAppUrl } from "../whatsapp"

describe("buildWhatsAppUrl", () => {
  it("keeps only digits of the number", () => {
    expect(buildWhatsAppUrl("+55 (11) 99999-0000")).toBe("https://wa.me/5511999990000")
  })

  it("adds the encoded message when set", () => {
    expect(buildWhatsAppUrl("5511999990000", " Olá, vim pelo seu site. ")).toBe(
      "https://wa.me/5511999990000?text=Ol%C3%A1%2C%20vim%20pelo%20seu%20site."
    )
  })

  it("ignores empty or missing messages", () => {
    expect(buildWhatsAppUrl("5511999990000", "   ")).toBe("https://wa.me/5511999990000")
    expect(buildWhatsAppUrl("5511999990000", null)).toBe("https://wa.me/5511999990000")
  })
})
