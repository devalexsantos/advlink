import { describe, it, expect } from "vitest"
import { sanitizeRichText, sanitizeOptionalRichText } from "@/lib/sanitize-rich-text"
import { renderContent } from "@/lib/render-content"

describe("sanitizeRichText()", () => {
  it("removes event handlers from img and drops the img", () => {
    const out = sanitizeRichText('<p>x</p><img src=x onerror="alert(1)">')
    expect(out).toBe("<p>x</p>")
  })

  it("removes script tags and their content", () => {
    expect(sanitizeRichText("<p>a</p><script>alert(1)</script>")).toBe("<p>a</p>")
  })

  it("strips javascript: URLs from links", () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain("javascript")
    expect(out).toContain(">x</a>")
  })

  it("strips obfuscated javascript: URLs", () => {
    expect(sanitizeRichText('<a href="jav&#x09;ascript:alert(1)">x</a>')).not.toMatch(/javascript|alert/i)
  })

  it("removes iframes, styles and svg", () => {
    const out = sanitizeRichText('<iframe src="https://evil"></iframe><style>*{}</style><svg onload="x()"></svg><p>ok</p>')
    expect(out).toBe("<p>ok</p>")
  })

  it("keeps editor formatting (Tiptap output)", () => {
    const html =
      '<h2>Título</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p><ul><li>1</li></ul><ol><li>2</li></ol><blockquote><p>q</p></blockquote>'
    expect(sanitizeRichText(html)).toBe(html)
  })

  it("keeps allowed color/font-size styles and drops others", () => {
    const out = sanitizeRichText(
      '<p><span style="color: #ff0000; font-size: 18px; position: fixed; background-image: url(javascript:x)">t</span></p>'
    )
    expect(out).toBe('<p><span style="color: #ff0000; font-size: 18px">t</span></p>')
  })

  it("keeps highlight marks", () => {
    const out = sanitizeRichText('<mark data-color="#ff0" style="background-color: #ff0; color: inherit">h</mark>')
    expect(out).toBe('<mark data-color="#ff0" style="background-color: #ff0; color: inherit">h</mark>')
  })

  it("rejects style values that try to break out with url()", () => {
    expect(sanitizeRichText('<span style="color: url(x)">t</span>')).toBe("<span>t</span>")
  })

  it("adds rel noopener to target=_blank links", () => {
    const out = sanitizeRichText('<a href="https://x.com" target="_blank">x</a>')
    expect(out).toContain('rel="noopener noreferrer nofollow"')
    expect(out).toContain('href="https://x.com"')
  })

  it("keeps mailto and tel links", () => {
    expect(sanitizeRichText('<a href="mailto:a@b.com">m</a>')).toContain('href="mailto:a@b.com"')
    expect(sanitizeRichText('<a href="tel:+5511999999999">t</a>')).toContain('href="tel:+5511999999999"')
  })
})

describe("sanitizeOptionalRichText()", () => {
  it("passes null and undefined through", () => {
    expect(sanitizeOptionalRichText(null)).toBeNull()
    expect(sanitizeOptionalRichText(undefined)).toBeUndefined()
  })

  it("leaves plain text/markdown untouched", () => {
    const md = "> citação\n\n**negrito** & [link](https://x.com)"
    expect(sanitizeOptionalRichText(md)).toBe(md)
  })

  it("sanitizes values containing markup", () => {
    expect(sanitizeOptionalRichText('<p>x</p><img src=x onerror="alert(1)">')).toBe("<p>x</p>")
  })
})

describe("renderContent() XSS", () => {
  it("sanitizes raw HTML content", () => {
    expect(renderContent('<p>x</p><img src=x onerror="alert(1)">')).toBe("<p>x</p>")
  })

  it("sanitizes HTML embedded in markdown", () => {
    const out = renderContent('**oi** <img src=x onerror="alert(1)">')
    expect(out).toContain("<strong>oi</strong>")
    expect(out).not.toContain("onerror")
  })

  it("sanitizes javascript: links produced by markdown", () => {
    expect(renderContent("[clique](javascript:alert(1))")).not.toContain("javascript:")
  })
})
