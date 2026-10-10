// Custom domains (e.g. escritorio.adv.br) pointing straight at the VPS (A record, not behind
// Cloudflare). Flow: pending_dns → (TXT + A ok) → Easypanel createDomain → provisioning →
// (HTTPS answers with our x-advlink-site header) → active. See app/api/custom-domain/*.
import { randomBytes } from "node:crypto"
import * as dnsPromises from "node:dns/promises"
import type { CustomDomain } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { activeHostOf, getRootDomain } from "@/lib/site-url"
import { getEasypanel } from "@/lib/easypanel"

export type CustomDomainStatus = "pending_dns" | "provisioning" | "active" | "error"

/** Response header set by the proxy on custom-host pages; checkHttps looks for it. */
export const SITE_HEADER = "x-advlink-site"

const TXT_PREFIX = "_advlink"
const TXT_VALUE_PREFIX = "advlink-verify="

// Special-use / internal TLDs that can never get a public certificate
const BLOCKED_TLDS = new Set(["localhost", "local", "internal", "lan", "home", "test", "invalid", "example", "onion", "arpa"])
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const TLD_RE = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

function rootDomainHost() {
  return getRootDomain().toLowerCase().replace(/:\d+$/, "")
}

/**
 * Normalizes user input ("https://WWW.Escritorio.adv.br/contato") to a bare lowercase punycode
 * host ("www.xn--escritrio-...adv.br"). Returns null for anything that isn't a public hostname,
 * or that belongs to our own root domain.
 */
export function normalizeHost(input: unknown): string | null {
  if (typeof input !== "string") return null
  let raw = input.trim().toLowerCase()
  if (!raw || raw.length > 300) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(raw)) raw = `http://${raw}`

  let hostname: string
  try {
    const url = new URL(raw)
    if (url.username || url.password) return null
    hostname = url.hostname
  } catch {
    return null
  }

  hostname = hostname.replace(/\.$/, "")
  if (!hostname || hostname.length > 253) return null
  if (hostname.startsWith("[")) return null // IPv6 literal

  const labels = hostname.split(".")
  if (labels.length < 2) return null
  if (!labels.every((l) => LABEL_RE.test(l))) return null
  const tld = labels[labels.length - 1]
  if (!TLD_RE.test(tld) || BLOCKED_TLDS.has(tld)) return null // TLD_RE also rejects IPv4

  const root = rootDomainHost()
  if (hostname === root || hostname.endsWith(`.${root}`)) return null
  return hostname
}

export function getCustomDomainIp(): string | null {
  return process.env.CUSTOM_DOMAIN_IP?.trim() || null
}

/** Easypanel credentials and the VPS IP are both needed to connect domains. */
export function isCustomDomainConfigured(): boolean {
  return getEasypanel() !== null && getCustomDomainIp() !== null
}

export function generateVerifyToken(): string {
  return randomBytes(16).toString("hex")
}

export function txtRecordName(host: string) {
  return `${TXT_PREFIX}.${host}`
}

export function txtRecordValue(token: string) {
  return `${TXT_VALUE_PREFIX}${token}`
}

export type CustomDomainDto = {
  host: string
  status: CustomDomainStatus
  verifyToken: string
  txtName: string
  txtValue: string
  targetIp: string | null
  error: string | null
  activatedAt: Date | null
  lastCheckedAt: Date | null
}

export function toCustomDomainDto(d: CustomDomain): CustomDomainDto {
  return {
    host: d.host,
    status: d.status as CustomDomainStatus,
    verifyToken: d.verifyToken,
    txtName: txtRecordName(d.host),
    txtValue: txtRecordValue(d.verifyToken),
    targetIp: getCustomDomainIp(),
    error: d.error,
    activatedAt: d.activatedAt,
    lastCheckedAt: d.lastCheckedAt,
  }
}

// ---------------------------------------------------------------------------------------------
// Checks

export type DnsDeps = {
  resolveTxt: (name: string) => Promise<string[][]>
  resolve4: (name: string) => Promise<string[]>
  resolve6: (name: string) => Promise<string[]>
}

export type DnsCheck = {
  txtOk: boolean
  aOk: boolean
  /** No AAAA record (Let's Encrypt prefers IPv6, and the VPS isn't reachable on it). */
  aaaaOk: boolean
  aRecords: string[]
  aaaaRecords: string[]
}

const swallow = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback)

export async function checkDns(host: string, token: string, deps: DnsDeps = dnsPromises): Promise<DnsCheck> {
  const ip = getCustomDomainIp()
  const expected = txtRecordValue(token)
  const [txt, aRecords, aaaaRecords] = await Promise.all([
    swallow(deps.resolveTxt(txtRecordName(host)), [] as string[][]),
    swallow(deps.resolve4(host), [] as string[]),
    swallow(deps.resolve6(host), [] as string[]),
  ])
  const txtOk = txt.some((chunks) => chunks.join("").trim() === expected)
  // Every A record must be ours: with extra IPs the ACME challenge may hit another server
  const aOk = !!ip && aRecords.length > 0 && aRecords.every((r) => r === ip)
  return { txtOk, aOk, aaaaOk: aaaaRecords.length === 0, aRecords, aaaaRecords }
}

export function dnsOk(c: DnsCheck) {
  return c.txtOk && c.aOk && c.aaaaOk
}

/** pt-BR description of what is still missing in the lawyer's DNS. */
export function describeDnsProblems(host: string, c: DnsCheck): string {
  const ip = getCustomDomainIp() ?? "?"
  const problems: string[] = []
  if (!c.txtOk) problems.push(`registro TXT ${txtRecordName(host)} não encontrado ou com valor diferente`)
  if (!c.aOk) {
    problems.push(
      c.aRecords.length === 0
        ? `registro A de ${host} não encontrado (deve apontar para ${ip})`
        : `registro A de ${host} aponta para ${c.aRecords.join(", ")}, mas deve apontar só para ${ip} (se usa Cloudflare, desative o proxy/nuvem laranja)`,
    )
  }
  if (!c.aaaaOk) problems.push(`remova o registro AAAA (IPv6) de ${host}`)
  return `DNS ainda não configurado: ${problems.join("; ")}. Alterações de DNS podem levar algumas horas para propagar.`
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** True when https://<host>/ is served by this app for this site (valid certificate + our header). */
export async function checkHttps(host: string, profileId: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`https://${host}/`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    // Body isn't needed; free the socket
    res.body?.cancel().catch(() => {})
    return res.headers.get(SITE_HEADER) === profileId
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------------------------
// Lookups (proxy + canonical URLs)

/** Host of the site's custom domain when it is active, else null. */
export async function getActiveCustomDomainHost(profileId: string): Promise<string | null> {
  const d = await prisma.customDomain.findUnique({ where: { profileId }, select: { host: true, status: true } })
  return d?.status === "active" ? d.host : null
}

export { activeHostOf }

export type ResolvedCustomHost = { slug: string; profileId: string; status: "provisioning" | "active" }

type CacheEntry<T> = { value: T; expiresAt: number }
type HostCaches = {
  byHost: Map<string, CacheEntry<ResolvedCustomHost | null>>
  bySlug: Map<string, CacheEntry<string | null>>
}

const CACHE_TTL_MS = 60_000
const CACHE_MAX = 5_000

// On globalThis so the proxy bundle and the route bundles share it (same Node process)
const caches: HostCaches = ((globalThis as { __advlinkCustomHostCache?: HostCaches }).__advlinkCustomHostCache ??= {
  byHost: new Map(),
  bySlug: new Map(),
})

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | undefined {
  const e = map.get(key)
  if (!e) return undefined
  if (e.expiresAt <= Date.now()) {
    map.delete(key)
    return undefined
  }
  return e
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  // Random Host headers would otherwise grow the negative cache without bound
  if (map.size >= CACHE_MAX) map.clear()
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Site served on a custom host (cached 60s, negatives included). Provisioning domains resolve
 * too: their DNS is already verified and checkHttps needs the page (and header) to activate them.
 */
export async function resolveCustomHost(host: string): Promise<ResolvedCustomHost | null> {
  const key = host.toLowerCase()
  const hit = cacheGet(caches.byHost, key)
  if (hit) return hit.value

  const d = await prisma.customDomain.findUnique({
    where: { host: key },
    select: { status: true, profileId: true, profile: { select: { slug: true } } },
  })
  const value: ResolvedCustomHost | null =
    d && (d.status === "active" || d.status === "provisioning") && d.profile?.slug
      ? { slug: d.profile.slug, profileId: d.profileId, status: d.status }
      : null
  cacheSet(caches.byHost, key, value)
  return value
}

/** Active custom host of the site with this slug (cached 60s), for subdomain → domain redirects. */
export async function resolveActiveHostForSlug(slug: string): Promise<string | null> {
  const hit = cacheGet(caches.bySlug, slug)
  if (hit) return hit.value

  let d: { host: string } | null
  try {
    d = await prisma.customDomain.findFirst({ where: { status: "active", profile: { slug } }, select: { host: true } })
  } catch (err) {
    // Never take subdomain sites down because of this lookup: serve them in place (not cached)
    console.error("[custom-domain] lookup por slug falhou", { slug, error: (err as Error).message })
    return null
  }
  const value = d?.host ?? null
  cacheSet(caches.bySlug, slug, value)
  return value
}

/** Drop cached lookups; call whenever a domain is created, changes status or is removed. */
export function clearCustomHostCache() {
  caches.byHost.clear()
  caches.bySlug.clear()
}
