// Consent for third-party tags (Google Tag Manager) on public profiles. Stored per container in
// the visitor's browser only; the server never sees it.

export type GtmConsentChoice = "granted" | "denied"

export function gtmConsentKey(gtmId: string): string {
  return `advlink_consent_${gtmId}`
}

export function readGtmConsent(gtmId: string): GtmConsentChoice | null {
  try {
    const v = window.localStorage.getItem(gtmConsentKey(gtmId))
    return v === "granted" || v === "denied" ? v : null
  } catch {
    return null
  }
}

export function clearGtmConsent(gtmId: string): void {
  try {
    window.localStorage.removeItem(gtmConsentKey(gtmId))
  } catch {
    // storage unavailable: nothing to clear
  }
}
