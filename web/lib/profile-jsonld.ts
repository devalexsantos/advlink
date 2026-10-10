import { getProfileUrl } from "@/lib/site-url"
import { normalizeOabNumber, normalizeUf } from "@/lib/oab"
import { formatCnpj, normalizeCnpj } from "@/lib/cnpj"
import { toFaqPlainText } from "@/lib/area-faq"

type ProfileForJsonLd = {
  slug: string
  publicName: string | null
  headline?: string | null
  oabNumber?: string | null
  oabState?: string | null
  metaDescription?: string | null
  avatarUrl?: string | null
  publicPhone?: string | null
  publicEmail?: string | null
  instagramUrl?: string | null
  linkedinUrl?: string | null
  facebookUrl?: string | null
  youtubeUrl?: string | null
  firmName?: string | null
  firmType?: string | null
  firmOabRegistration?: string | null
  firmCnpj?: string | null
  languages?: string | null
}

type AreaForFaqJsonLd = { faqs?: { question: string; answer: string }[] | null }

type AddressForJsonLd = {
  public: boolean
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
} | null | undefined

/**
 * schema.org LegalService for a public profile. Deliberately has no rating/review data:
 * OAB Provimento 205/2021 forbids advertising based on client testimonials/results.
 */
export function buildProfileJsonLd(
  profile: ProfileForJsonLd,
  address: AddressForJsonLd,
  areaTitles: string[],
  /** Canonical site URL (custom domain); defaults to the profile subdomain. */
  siteUrl?: string,
) {
  const url = siteUrl ?? getProfileUrl(profile.slug)
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${url}#legalservice`,
    name: profile.publicName || profile.slug,
    url,
  }
  const description = profile.metaDescription || profile.headline
  if (description) data.description = description
  if (profile.avatarUrl) data.image = profile.avatarUrl
  if (profile.publicPhone) data.telephone = profile.publicPhone
  if (profile.publicEmail) data.email = profile.publicEmail
  const sameAs = [profile.instagramUrl, profile.linkedinUrl, profile.facebookUrl, profile.youtubeUrl].filter(
    (u): u is string => Boolean(u)
  )
  if (sameAs.length) data.sameAs = sameAs
  const oabNumber = normalizeOabNumber(profile.oabNumber)
  const oabState = normalizeUf(profile.oabState)
  if (oabNumber && oabState) {
    data.identifier = { "@type": "PropertyValue", propertyID: `OAB/${oabState}`, value: oabNumber }
  }
  if (areaTitles.length) data.knowsAbout = areaTitles
  const languages = splitLanguages(profile.languages)
  if (languages.length) data.knowsLanguage = languages

  // The LegalService is the lawyer's site; the firm (sociedade) they belong to is its parent organization
  const firmName = profile.firmName?.trim()
  if (firmName) {
    const cnpj = normalizeCnpj(profile.firmCnpj)
    const firmOab = profile.firmOabRegistration?.trim()
    data.parentOrganization = {
      "@type": "LegalService",
      name: firmName,
      ...(cnpj.length === 14 ? { taxID: formatCnpj(cnpj) } : {}),
      ...(firmOab ? { identifier: { "@type": "PropertyValue", propertyID: "OAB", value: firmOab } } : {}),
    }
  }

  // Only when the lawyer chose to show the address on the page
  if (address?.public && (address.city || address.street)) {
    const street = [address.street, address.number, address.complement].filter(Boolean).join(", ")
    data.address = {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      ...(address.city ? { addressLocality: address.city } : {}),
      ...(address.state ? { addressRegion: address.state } : {}),
      ...(address.zipCode ? { postalCode: address.zipCode } : {}),
      addressCountry: "BR",
    }
  }
  if (address?.public && address.city) {
    data.areaServed = { "@type": "City", name: address.state ? `${address.city} - ${address.state}` : address.city }
  }
  return data
}

/** "Português, Inglês e Espanhol" → ["Português", "Inglês", "Espanhol"] */
function splitLanguages(value: string | null | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  return value
    .split(/,|;|\s+e\s+/i)
    .map((l) => l.trim())
    .filter((l) => {
      const key = l.toLowerCase()
      if (!l || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** schema.org FAQPage with every practice-area FAQ (plain text), or null when there are none. */
export function buildFaqJsonLd(areas: AreaForFaqJsonLd[]): Record<string, unknown> | null {
  const mainEntity = areas
    .flatMap((a) => a.faqs ?? [])
    .map((f) => ({ question: toFaqPlainText(f.question), answer: toFaqPlainText(f.answer) }))
    .filter((f) => f.question && f.answer)
    .map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    }))
  if (!mainEntity.length) return null
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity }
}

/** Serializes JSON-LD for a <script> tag; escapes "<" so user data can't close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
