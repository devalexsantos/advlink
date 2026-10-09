import { cookies } from "next/headers"
import { ATTRIBUTION_COOKIE, parseAttributionCookie, type Attribution } from "@/lib/attribution"

/** Attribution cookie of the current request (route handlers / NextAuth events). Never throws. */
export async function getRequestAttribution(): Promise<Attribution | null> {
  try {
    const store = await cookies()
    return parseAttributionCookie(store.get(ATTRIBUTION_COOKIE)?.value)
  } catch {
    return null
  }
}
