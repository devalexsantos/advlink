import { formatOab } from "@/lib/oab"

export type VCardInput = {
  name: string
  oabNumber?: string | null
  oabState?: string | null
  phone?: string | null
  email?: string | null
  url?: string | null
}

/** Escapes a vCard 3.0 text value (RFC 2426): backslash, comma, semicolon and newlines. */
export function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\;")
}

/** Folds lines longer than 75 octets-ish (chars) with CRLF + space, as the spec asks. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74))
  return parts.join("\r\n")
}

/** Builds a vCard 3.0 string for the lawyer's digital card. Pure function. */
export function buildVCard(input: VCardInput): string {
  const name = input.name.trim()
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardText(name)}`, `N:${escapeVCardText(name)};;;;`]

  const oab = formatOab(input.oabNumber, input.oabState)
  lines.push(`TITLE:${escapeVCardText(oab ? `Advogado(a) - ${oab}` : "Advogado(a)")}`)

  const phone = input.phone?.trim()
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCardText(phone)}`)
  const email = input.email?.trim()
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardText(email)}`)
  const url = input.url?.trim()
  if (url) lines.push(`URL:${url.replace(/[\r\n]/g, "")}`)

  lines.push("END:VCARD")
  return lines.map(fold).join("\r\n") + "\r\n"
}
