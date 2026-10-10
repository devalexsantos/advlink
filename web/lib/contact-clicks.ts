/** Channels counted by the public-profile contact-click beacon (see ProfileTracker). */
export const CONTACT_KINDS = ["whatsapp", "phone", "email", "link"] as const
export type ContactKind = (typeof CONTACT_KINDS)[number]

export function isContactKind(value: unknown): value is ContactKind {
  return typeof value === "string" && (CONTACT_KINDS as readonly string[]).includes(value)
}

/**
 * Classifies a link the visitor clicked. Returns null for links that aren't contacts:
 * internal paths, in-page anchors, same-host URLs and unsupported schemes.
 */
export function classifyContactHref(href: string, currentHost: string): ContactKind | null {
  const raw = href.trim()
  if (!raw || raw.startsWith("#")) return null
  const lower = raw.toLowerCase()
  if (lower.startsWith("tel:")) return "phone"
  if (lower.startsWith("mailto:")) return "email"

  let url: URL
  try {
    url = new URL(raw, `https://${currentHost}/`)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  const host = url.hostname.toLowerCase()
  if (host === "wa.me" || host === "api.whatsapp.com") return "whatsapp"
  if (/(^|\.)whatsapp\.com$/.test(host) && url.pathname.startsWith("/send")) return "whatsapp"
  if (url.host.toLowerCase() === currentHost.toLowerCase()) return null
  return "link"
}
