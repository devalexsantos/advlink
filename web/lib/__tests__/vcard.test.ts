import { describe, it, expect } from "vitest"
import { buildVCard, escapeVCardText } from "@/lib/vcard"

describe("escapeVCardText", () => {
  it("escapes backslash, comma, semicolon and newlines", () => {
    expect(escapeVCardText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne")
  })
})

describe("buildVCard", () => {
  it("builds a complete vCard 3.0 with CRLF line endings", () => {
    const v = buildVCard({
      name: "Ana Souza",
      oabNumber: "123456",
      oabState: "SP",
      phone: "+55 11 99999-0000",
      email: "ana@exemplo.com",
      url: "https://ana.advlink.site/",
    })
    expect(v).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "FN:Ana Souza",
        "N:Ana Souza;;;;",
        "TITLE:Advogado(a) - OAB/SP 123.456",
        "TEL;TYPE=CELL:+55 11 99999-0000",
        "EMAIL;TYPE=INTERNET:ana@exemplo.com",
        "URL:https://ana.advlink.site/",
        "END:VCARD",
        "",
      ].join("\r\n"),
    )
  })

  it("omits optional fields and OAB when missing", () => {
    const v = buildVCard({ name: "Ana", oabNumber: null, oabState: null })
    expect(v).toContain("TITLE:Advogado(a)\r\n")
    expect(v).not.toContain("TEL")
    expect(v).not.toContain("EMAIL")
    expect(v).not.toContain("URL")
  })

  it("escapes special characters in the name", () => {
    expect(buildVCard({ name: "Silva, Souza; Adv." })).toContain("FN:Silva\\, Souza\; Adv.")
  })

  it("folds long lines", () => {
    const v = buildVCard({ name: "x".repeat(200) })
    expect(v).toMatch(/\r\n x/)
  })
})
