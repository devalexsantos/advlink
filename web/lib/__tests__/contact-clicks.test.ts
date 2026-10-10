import { describe, it, expect } from "vitest"
import { classifyContactHref, isBeaconContactKind, isContactKind } from "@/lib/contact-clicks"

const HOST = "joao.advlink.site"

describe("classifyContactHref", () => {
  it.each([
    ["https://wa.me/5511999999999?text=Ol%C3%A1", "whatsapp"],
    ["https://api.whatsapp.com/send?phone=5511999999999", "whatsapp"],
    ["https://web.whatsapp.com/send?phone=5511", "whatsapp"],
    ["https://whatsapp.com/send?phone=5511", "whatsapp"],
    ["tel:+5511999999999", "phone"],
    ["TEL:11999999999", "phone"],
    ["mailto:contato@escritorio.adv.br", "email"],
    ["https://instagram.com/escritorio", "link"],
    ["http://calendly.com/joao", "link"],
    ["https://www.whatsapp.com/download", "link"],
  ])("classifies %s as %s", (href, kind) => {
    expect(classifyContactHref(href, HOST)).toBe(kind)
  })

  it.each([
    ["#contato"],
    ["/"],
    ["/termos"],
    [`https://${HOST}/sobre`],
    ["javascript:void(0)"],
    [""],
  ])("ignores %s", (href) => {
    expect(classifyContactHref(href, HOST)).toBeNull()
  })
})

describe("isContactKind", () => {
  it("accepts only the known channels", () => {
    expect(isContactKind("whatsapp")).toBe(true)
    expect(isContactKind("link")).toBe(true)
    expect(isContactKind("form")).toBe(true)
    expect(isContactKind("sms")).toBe(false)
    expect(isContactKind(undefined)).toBe(false)
  })
})

describe("isBeaconContactKind", () => {
  it("rejects the server-only form channel", () => {
    expect(isBeaconContactKind("whatsapp")).toBe(true)
    expect(isBeaconContactKind("link")).toBe(true)
    expect(isBeaconContactKind("form")).toBe(false)
    expect(isBeaconContactKind("sms")).toBe(false)
  })
})
