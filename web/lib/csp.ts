// Nonce-based Content-Security-Policy for the private areas (dashboard, onboarding, login, admin).
//
// Scope: only these app pages. Lawyers' public profiles (/adv/[slug] and <slug>.ROOT_DOMAIN) are
// deliberately left out: they load the Google Tag Manager container configured by the lawyer
// (Profile.gtmContainerId), which injects arbitrary third-party tags a strict script-src would break.
// Those pages are isolated by origin (served only on their own subdomain) and by server-side
// sanitization (SEC-1), not by CSP.
//
// Only script-src is restricted (plus the framing/base/object/form directives). There is no
// default-src on purpose: images (S3, Google avatars, Meta Pixel beacons), styles (React inline
// styles, toploader, Tiptap), fonts and connections stay unrestricted until they are inventoried.

const PRIVATE_PATH = /^\/(profile|admin|login|onboarding)(\/|$)/

export function isCspProtectedPath(pathname: string) {
  return PRIVATE_PATH.test(pathname)
}

export function generateNonce() {
  // 128 bits from the Web Crypto API (edge-safe, like the rest of proxy.ts's imports)
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
}

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV === "development") {
  return [
    // 'strict-dynamic' lets nonced scripts load their own dependencies (Next chunks, fbevents.js);
    // host allow-lists and 'self' are ignored by CSP3 browsers and kept only as a CSP2 fallback.
    // React/Turbopack need eval in dev only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    // Every form in these areas submits via fetch; NextAuth's Google sign-in navigates with
    // window.location (not a form post), so this doesn't affect the OAuth redirect.
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}
