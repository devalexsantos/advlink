// Canonical URLs for the app and public profiles. Safe on server and client: on the client only
// NEXT_PUBLIC_* vars exist (inlined at build time), so every helper falls back to production values.

const DEFAULT_ROOT_DOMAIN = "advlink.site"

/** Domain that hosts the public profiles as <slug>.<rootDomain> (may include a port locally). */
export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN
}

function protocolFor(host: string) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || host.endsWith(".localhost") || /\.localhost:\d+$/.test(host)
    ? "http"
    : "https"
}

/** Public URL of a profile, e.g. https://joao.advlink.site/ */
export function getProfileUrl(slug: string): string {
  const root = getRootDomain()
  return `${protocolFor(root)}://${slug}.${root}/`
}

/**
 * Canonical public URL of a site: its custom domain when active (https://escritorio.adv.br/),
 * else the subdomain URL.
 */
export function getSiteUrl({ slug, customDomainHost }: { slug: string; customDomainHost?: string | null }): string {
  return customDomainHost ? `https://${customDomainHost}/` : getProfileUrl(slug)
}

/** Host of a loaded `customDomain: { host, status }` relation when it is active, else null. */
export function activeHostOf(d: { host: string; status: string } | null | undefined): string | null {
  return d?.status === "active" ? d.host : null
}

/** Host shown to the user for a profile, e.g. joao.advlink.site */
export function getProfileHost(slug: string): string {
  return `${slug}.${getRootDomain()}`
}

/** Origin of the dashboard app, e.g. https://app.advlink.site */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXTAUTH_URL
  if (configured) return configured.replace(/\/+$/, "")
  const root = getRootDomain()
  return `${protocolFor(root)}://app.${root}`
}
