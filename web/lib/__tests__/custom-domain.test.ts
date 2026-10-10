// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { customDomain: { findUnique: vi.fn(), findFirst: vi.fn() } },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import {
  checkDns,
  checkHttps,
  clearCustomHostCache,
  describeDnsProblems,
  dnsOk,
  generateVerifyToken,
  normalizeHost,
  resolveActiveHostForSlug,
  resolveCustomHost,
  toCustomDomainDto,
} from "@/lib/custom-domain"

const IP = "203.0.113.10"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ROOT_DOMAIN", "advlink.site")
  vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
  vi.stubEnv("CUSTOM_DOMAIN_IP", IP)
  clearCustomHostCache()
})
afterEach(() => vi.unstubAllEnvs())

describe("normalizeHost", () => {
  it.each([
    ["escritorio.adv.br", "escritorio.adv.br"],
    ["  WWW.Escritorio.ADV.br  ", "www.escritorio.adv.br"],
    ["https://escritorio.adv.br/contato?x=1", "escritorio.adv.br"],
    ["http://escritorio.adv.br:8080", "escritorio.adv.br"],
    ["escritorio.adv.br.", "escritorio.adv.br"],
    ["escritório.adv.br", "xn--escritrio-b7a.adv.br"],
    ["silva-advogados.com", "silva-advogados.com"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeHost(input)).toBe(expected)
  })

  it.each([
    "",
    "   ",
    "localhost",
    "foo.localhost",
    "intranet",
    "192.168.0.1",
    "http://10.0.0.1/",
    "[::1]",
    "advlink.site",
    "joao.advlink.site",
    "https://APP.advlink.site/",
    "-bad.com.br",
    "bad_.com.br",
    "user:pass@site.com.br",
    "site.123",
    `${"a".repeat(64)}.com`,
    `${"a.".repeat(130)}com`,
    "meu site.com.br",
  ])("rejects %s", (input) => {
    expect(normalizeHost(input)).toBeNull()
  })

  it("rejects non-strings", () => {
    expect(normalizeHost(undefined)).toBeNull()
    expect(normalizeHost(42)).toBeNull()
  })

  it("ignores the port of ROOT_DOMAIN in local dev", () => {
    vi.stubEnv("ROOT_DOMAIN", "localhost:3000")
    expect(normalizeHost("escritorio.adv.br")).toBe("escritorio.adv.br")
  })
})

describe("DNS records and DTO", () => {
  it("generates 32-char hex tokens", () => {
    const t = generateVerifyToken()
    expect(t).toMatch(/^[0-9a-f]{32}$/)
    expect(generateVerifyToken()).not.toBe(t)
  })

  it("exposes the TXT name/value and target IP", () => {
    const dto = toCustomDomainDto({
      id: "d1",
      profileId: "p1",
      host: "a.com.br",
      status: "pending_dns",
      verifyToken: "tok",
      easypanelDomainId: "secret-id",
      lastCheckedAt: null,
      activatedAt: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(dto).toEqual({
      host: "a.com.br",
      status: "pending_dns",
      verifyToken: "tok",
      txtName: "_advlink.a.com.br",
      txtValue: "advlink-verify=tok",
      targetIp: IP,
      error: null,
      activatedAt: null,
      lastCheckedAt: null,
    })
  })
})

describe("checkDns", () => {
  const deps = (txt: string[][] | Error, a: string[] | Error, aaaa: string[] | Error = []) => ({
    resolveTxt: vi.fn(async () => (txt instanceof Error ? Promise.reject(txt) : txt)),
    resolve4: vi.fn(async () => (a instanceof Error ? Promise.reject(a) : a)),
    resolve6: vi.fn(async () => (aaaa instanceof Error ? Promise.reject(aaaa) : aaaa)),
  })

  it("passes when TXT matches (chunked) and every A record is the VPS", async () => {
    const d = deps([["other"], ["advlink-verify=", "tok"]], [IP])
    const r = await checkDns("a.com.br", "tok", d)
    expect(d.resolveTxt).toHaveBeenCalledWith("_advlink.a.com.br")
    expect(r).toMatchObject({ txtOk: true, aOk: true, aaaaOk: true, aRecords: [IP] })
    expect(dnsOk(r)).toBe(true)
  })

  it("fails on missing records, a foreign A record or an AAAA record", async () => {
    const enotfound = Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" })
    const missing = await checkDns("a.com.br", "tok", deps(enotfound, enotfound, enotfound))
    expect(missing).toMatchObject({ txtOk: false, aOk: false, aaaaOk: true, aRecords: [] })

    const mixed = await checkDns("a.com.br", "tok", deps([["advlink-verify=tok"]], [IP, "104.16.0.1"]))
    expect(mixed.aOk).toBe(false)

    const v6 = await checkDns("a.com.br", "tok", deps([["advlink-verify=tok"]], [IP], ["2606:4700::1"]))
    expect(dnsOk(v6)).toBe(false)
    expect(describeDnsProblems("a.com.br", v6)).toContain("AAAA")
  })

  it("is never ok without CUSTOM_DOMAIN_IP", async () => {
    vi.stubEnv("CUSTOM_DOMAIN_IP", "")
    const r = await checkDns("a.com.br", "tok", deps([["advlink-verify=tok"]], [IP]))
    expect(r.aOk).toBe(false)
  })

  it("describes what is missing in pt-BR", () => {
    const msg = describeDnsProblems("a.com.br", { txtOk: false, aOk: false, aaaaOk: true, aRecords: ["1.2.3.4"], aaaaRecords: [] })
    expect(msg).toContain("_advlink.a.com.br")
    expect(msg).toContain(`deve apontar só para ${IP}`)
    expect(msg).toContain("1.2.3.4")
  })
})

describe("checkHttps", () => {
  it("is true only when our header carries the site id", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { headers: { "x-advlink-site": "p1" } }))
    await expect(checkHttps("a.com.br", "p1", fetchImpl)).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith("https://a.com.br/", expect.objectContaining({ redirect: "manual" }))
    await expect(checkHttps("a.com.br", "p2", fetchImpl)).resolves.toBe(false)
  })

  it("is false on TLS/network errors", async () => {
    const fetchImpl = vi.fn(async () => Promise.reject(new Error("certificate has expired")))
    await expect(checkHttps("a.com.br", "p1", fetchImpl)).resolves.toBe(false)
  })
})

describe("resolveCustomHost / resolveActiveHostForSlug", () => {
  it("resolves active and provisioning domains of sites with a slug, cached", async () => {
    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "active", profileId: "p1", profile: { slug: "joao" } })
    await expect(resolveCustomHost("A.com.br")).resolves.toEqual({ slug: "joao", profileId: "p1", status: "active" })
    await resolveCustomHost("a.com.br")
    expect(prismaMock.customDomain.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.customDomain.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { host: "a.com.br" } }))

    clearCustomHostCache()
    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "provisioning", profileId: "p1", profile: { slug: "joao" } })
    await expect(resolveCustomHost("a.com.br")).resolves.toMatchObject({ status: "provisioning" })
  })

  it("returns null (cached) for unknown, pending or slug-less domains", async () => {
    prismaMock.customDomain.findUnique.mockResolvedValue(null)
    await expect(resolveCustomHost("x.com.br")).resolves.toBeNull()
    await expect(resolveCustomHost("x.com.br")).resolves.toBeNull()
    expect(prismaMock.customDomain.findUnique).toHaveBeenCalledTimes(1)

    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "pending_dns", profileId: "p1", profile: { slug: "joao" } })
    await expect(resolveCustomHost("y.com.br")).resolves.toBeNull()
    prismaMock.customDomain.findUnique.mockResolvedValue({ status: "active", profileId: "p1", profile: { slug: null } })
    await expect(resolveCustomHost("z.com.br")).resolves.toBeNull()
  })

  it("expires entries after 60s", async () => {
    vi.useFakeTimers()
    try {
      prismaMock.customDomain.findUnique.mockResolvedValue(null)
      await resolveCustomHost("x.com.br")
      vi.advanceTimersByTime(61_000)
      await resolveCustomHost("x.com.br")
      expect(prismaMock.customDomain.findUnique).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("finds the active host for a slug and swallows DB errors", async () => {
    prismaMock.customDomain.findFirst.mockResolvedValue({ host: "a.com.br" })
    await expect(resolveActiveHostForSlug("joao")).resolves.toBe("a.com.br")
    expect(prismaMock.customDomain.findFirst).toHaveBeenCalledWith({
      where: { status: "active", profile: { slug: "joao" } },
      select: { host: true },
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
    prismaMock.customDomain.findFirst.mockRejectedValue(new Error("db down"))
    await expect(resolveActiveHostForSlug("maria")).resolves.toBeNull()
  })
})
