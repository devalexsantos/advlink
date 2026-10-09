import { getAppOrigin } from "@/lib/site-url"

export const DEFAULT_CALLBACK = "/profile/edit"

/**
 * Turns a user-supplied callbackUrl (from ?callbackUrl=) into a same-origin path, so a crafted
 * login link can't send the user to another site after signing in (open redirect).
 */
export function getSafeCallbackUrl(raw: unknown, fallback = DEFAULT_CALLBACK): string {
  if (typeof raw !== "string" || !raw) return fallback
  // Relative path, but not protocol-relative ("//evil.com") or backslash tricks ("/\\evil.com")
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw
  try {
    const appOrigin = new URL(getAppOrigin())
    const url = new URL(raw)
    if (url.origin !== appOrigin.origin) return fallback
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}
