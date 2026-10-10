import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { getAppOrigin, getRootDomain } from "@/lib/site-url"
import { hostnameOf, isPlatformHost } from "@/lib/platform-host"
import { resolveCustomHost } from "@/lib/custom-domain"

const PROFILE_RULES = { userAgent: "*", allow: "/", disallow: "/api/" }

// Served on every host: the app (app.ROOT_DOMAIN), each public profile (<slug>.ROOT_DOMAIN) and
// lawyers' custom domains (robots.txt is outside the proxy matcher, so the host is handled here).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? ""
  const root = getRootDomain()

  if (!isPlatformHost(host)) {
    const hostname = hostnameOf(host)
    const site = await resolveCustomHost(hostname).catch(() => null)
    if (site) return { rules: PROFILE_RULES, sitemap: `https://${hostname}/sitemap.xml` }
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  // Cross-host sitemap: every platform host's robots.txt points to the app sitemap
  const sitemap = `${getAppOrigin()}/sitemap.xml`
  const isProfileHost = host.endsWith(`.${root}`) && host !== `app.${root}`

  if (isProfileHost) {
    return { rules: PROFILE_RULES, sitemap }
  }

  // App host: only the public legal page is meant for search engines
  return {
    rules: { userAgent: "*", allow: "/termos-e-privacidade", disallow: "/" },
    sitemap,
  }
}
