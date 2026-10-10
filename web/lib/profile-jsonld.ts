import { getProfileUrl } from "@/lib/site-url"
import { normalizeOabNumber, normalizeUf } from "@/lib/oab"

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
}

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
export function buildProfileJsonLd(profile: ProfileForJsonLd, address: AddressForJsonLd, areaTitles: string[]) {
  const url = getProfileUrl(profile.slug)
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
  if (profile.instagramUrl) data.sameAs = [profile.instagramUrl]
  const oabNumber = normalizeOabNumber(profile.oabNumber)
  const oabState = normalizeUf(profile.oabState)
  if (oabNumber && oabState) {
    data.identifier = { "@type": "PropertyValue", propertyID: `OAB/${oabState}`, value: oabNumber }
  }
  if (areaTitles.length) data.knowsAbout = areaTitles

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

/** Serializes JSON-LD for a <script> tag; escapes "<" so user data can't close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
