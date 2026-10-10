// Host classification shared by the proxy, robots.txt and sitemap.xml. No Prisma here.
import { RESERVED_SLUGS } from "@/lib/reserved-slugs"

/** Host header without the port ("[::1]:3000" → "[::1]", "a.localhost:3000" → "a.localhost"). */
export function hostnameOf(host: string): string {
  const h = host.toLowerCase()
  return h.startsWith("[") ? h.slice(0, h.indexOf("]") + 1) : h.replace(/:\d+$/, "")
}

function rootDomainEnv() {
  return (process.env.ROOT_DOMAIN || "advlink.site").toLowerCase()
}

/**
 * Hosts served by the regular app logic: ROOT_DOMAIN and its subdomains, the app origin, local dev
 * hosts (*localhost, IPs, DEV_ALLOWED_ORIGINS) and Easypanel's own preview domains. Anything else
 * is treated as a lawyer's custom domain.
 */
export function isPlatformHost(host: string, rootDomain: string = rootDomainEnv()): boolean {
  if (!host) return true
  const h = host.toLowerCase()
  const root = rootDomain.toLowerCase()
  if (h === root || h.endsWith(`.${root}`)) return true
  const hostname = hostnameOf(h)
  const rootName = hostnameOf(root)
  if (hostname === rootName || hostname.endsWith(`.${rootName}`)) return true
  if (hostname.endsWith("localhost") || hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true
  if (hostname.endsWith(".easypanel.host")) return true
  for (const origin of [process.env.NEXT_PUBLIC_APP_ORIGIN, process.env.NEXTAUTH_URL]) {
    if (!origin) continue
    try {
      if (new URL(origin).hostname.toLowerCase() === hostname) return true
    } catch {
      // ignore malformed env
    }
  }
  const devHosts = process.env.DEV_ALLOWED_ORIGINS?.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) ?? []
  return devHosts.some((d) => (d.startsWith("*.") ? hostname.endsWith(d.slice(1)) : hostnameOf(d) === hostname))
}

/** Slug of a public-profile subdomain (<slug>.ROOT_DOMAIN), or null for the apex/app/reserved hosts. */
export function profileSlugFromHost(host: string, rootDomain: string = rootDomainEnv()): string | null {
  const h = host.toLowerCase()
  const suffix = `.${rootDomain.toLowerCase()}`
  if (!h.endsWith(suffix)) return null
  const sub = h.slice(0, -suffix.length)
  if (!sub || !/^[a-z0-9-]+$/.test(sub) || RESERVED_SLUGS.has(sub)) return null
  return sub
}
