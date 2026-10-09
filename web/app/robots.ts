import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { getAppOrigin, getRootDomain } from "@/lib/site-url"

// Served on every host: the app (app.ROOT_DOMAIN) and each public profile (<slug>.ROOT_DOMAIN).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? ""
  const root = getRootDomain()
  // Cross-host sitemap: every host's robots.txt points to the app sitemap, which lists the profiles
  const sitemap = `${getAppOrigin()}/sitemap.xml`
  const isProfileHost = host.endsWith(`.${root}`) && host !== `app.${root}`

  if (isProfileHost) {
    return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap }
  }

  // App host: only the public legal page is meant for search engines
  return {
    rules: { userAgent: "*", allow: "/termos-e-privacidade", disallow: "/" },
    sitemap,
  }
}
