import { describe, it, expect } from "vitest"
import { renderContent } from "@/lib/render-content"

describe("renderContent()", () => {
  it("returns empty string for null", () => {
    expect(renderContent(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(renderContent(undefined)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(renderContent("")).toBe("")
  })

  it("returns HTML as-is when it contains HTML tags", () => {
    const html = "<p>Hello <strong>world</strong></p>"
    expect(renderContent(html)).toBe(html)
  })

  it("returns HTML as-is for div tags", () => {
    const html = "<div>Content</div>"
    expect(renderContent(html)).toBe(html)
  })

  it("parses markdown bold to HTML", () => {
    const result = renderContent("**bold**")
    expect(result).toContain("<strong>bold</strong>")
  })

  it("parses markdown heading to HTML", () => {
    const result = renderContent("# Heading")
    expect(result).toContain("<h1>")
    expect(result).toContain("Heading")
  })

  it("handles markdown line breaks", () => {
    const result = renderContent("line1\nline2")
    expect(result).toContain("<br")
  })
})
