import sanitizeHtml from "sanitize-html"

// Only the CSS the rich-text editor emits (Color, FontSize, Highlight).
const ALLOWED_STYLES: Record<string, RegExp> = {
  color: /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i,
  "background-color": /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i,
  "font-size": /^\d{1,3}(\.\d+)?(px|em|rem|%)$/i,
}

// Filtered by hand (parseStyleAttributes: false) so postcss never runs in the browser.
function filterStyle(style: string | undefined): string | undefined {
  if (!style) return undefined
  const kept = style
    .split(";")
    .map((decl) => {
      const idx = decl.indexOf(":")
      if (idx === -1) return null
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const value = decl.slice(idx + 1).trim()
      const re = ALLOWED_STYLES[prop]
      return re && re.test(value) ? `${prop}: ${value}` : null
    })
    .filter(Boolean)
  return kept.length ? kept.join("; ") : undefined
}

function withFilteredStyle(tagName: string, attribs: sanitizeHtml.Attributes) {
  const rest = { ...attribs }
  delete rest.style
  const style = filterStyle(attribs.style)
  return { tagName, attribs: style ? { ...rest, style } : rest }
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "div", "span",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "mark", "code", "pre", "blockquote",
    "ul", "ol", "li", "a",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["style"],
    mark: ["style", "data-color"],
    p: ["style"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  parseStyleAttributes: false,
  disallowedTagsMode: "discard",
  transformTags: {
    span: withFilteredStyle,
    mark: withFilteredStyle,
    p: withFilteredStyle,
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.target === "_blank" ? { rel: "noopener noreferrer nofollow" } : {}),
      },
    }),
  },
}

/** Strips scripts, event handlers, dangerous URLs and non-allowlisted tags/styles from user rich text. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS)
}

/**
 * Save-time variant: sanitizes values that contain markup and leaves plain text/markdown
 * untouched (escaping it would corrupt markdown like "> quote"); renderContent still
 * sanitizes the rendered output. Passes through null/undefined.
 */
export function sanitizeOptionalRichText<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string" || !value.includes("<")) return value
  return sanitizeRichText(value) as T
}
