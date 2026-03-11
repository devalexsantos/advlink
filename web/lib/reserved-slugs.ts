export const RESERVED_SLUGS = new Set([
  "admin", "app", "api", "www",
  "mail", "smtp", "ftp", "ssh",
  "login", "signup", "register",
  "dashboard", "painel",
  "billing", "stripe", "webhook",
  "support", "suporte", "help", "ajuda",
  "blog", "docs", "status",
  "static", "assets", "cdn", "media",
  "ns1", "ns2", "ns3", "mx",
  "test", "staging", "dev", "demo",
  "advlink", "adv",
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}
