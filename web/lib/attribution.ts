// First-touch marketing attribution (SEO-6). Edge-safe: imported by proxy.ts.

export const ATTRIBUTION_COOKIE = "advlink_attribution"
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90 // 90 days

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const
const MAX_VALUE_LENGTH = 200

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  referrer?: string
  landingPath?: string
  firstSeenAt?: string
}

/** Builds attribution from a landing request; null when there's nothing worth recording. */
export function attributionFromRequest(url: URL, referrer: string | null, now = new Date()): Attribution | null {
  const data: Attribution = {}
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key)
    if (value) data[key] = value.slice(0, MAX_VALUE_LENGTH)
  }
  // External referrers only (navigation inside the app says nothing about the channel)
  if (referrer) {
    try {
      const ref = new URL(referrer)
      if (ref.host !== url.host) data.referrer = `${ref.origin}${ref.pathname}`.slice(0, MAX_VALUE_LENGTH)
    } catch {
      // ignore malformed referrer
    }
  }
  if (Object.keys(data).length === 0) return null
  data.landingPath = url.pathname.slice(0, MAX_VALUE_LENGTH)
  data.firstSeenAt = now.toISOString()
  return data
}

export function parseAttributionCookie(value: string | undefined | null): Attribution | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const out: Attribution = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") (out as Record<string, string>)[k] = v.slice(0, MAX_VALUE_LENGTH)
    }
    return out
  } catch {
    return null
  }
}
