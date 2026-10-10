// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { FakeEasypanel } from "@/lib/easypanel-fake"
import { setEasypanelForTests } from "@/lib/easypanel"
import { resetRateLimiters } from "@/lib/rate-limit"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock, dnsMock, fetchMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findUnique: vi.fn() },
    customDomain: { findUnique: vi.fn(), update: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
  dnsMock: { resolveTxt: vi.fn(), resolve4: vi.fn(), resolve6: vi.fn() },
  fetchMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
vi.mock("node:dns/promises", () => ({ ...dnsMock, default: dnsMock }))

import { POST } from "@/app/api/custom-domain/verify/route"

const IP = "203.0.113.10"
const session = { user: { id: "user-1" } }

function row(over: Record<string, unknown> = {}) {
  return {
    id: "cd1",
    profileId: "profile-1",
    host: "escritorio.adv.br",
    status: "pending_dns",
    verifyToken: "tok",
    easypanelDomainId: null as string | null,
    lastCheckedAt: null,
    activatedAt: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

function dnsReady(ready = true) {
  dnsMock.resolveTxt.mockResolvedValue(ready ? [["advlink-verify=tok"]] : [])
  dnsMock.resolve4.mockResolvedValue(ready ? [IP] : ["1.2.3.4"])
  dnsMock.resolve6.mockRejectedValue(Object.assign(new Error("ENODATA"), { code: "ENODATA" }))
}

const siteHeader = (id: string | null) =>
  new Response("ok", { headers: id ? { "x-advlink-site": id } : {} })

let easypanel: FakeEasypanel
let current: ReturnType<typeof row>

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimiters()
  getServerSessionMock.mockResolvedValue(session)
  getActiveSiteIdMock.mockResolvedValue("profile-1")
  vi.stubEnv("CUSTOM_DOMAIN_IP", IP)
  vi.stubGlobal("fetch", fetchMock)
  easypanel = new FakeEasypanel()
  setEasypanelForTests(easypanel)
  current = row()
  prismaMock.profile.findUnique.mockResolvedValue({ isActive: true })
  prismaMock.customDomain.findUnique.mockImplementation(async () => current)
  prismaMock.customDomain.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    current = { ...current, ...data } as typeof current
    return current
  })
  fetchMock.mockResolvedValue(siteHeader(null))
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  setEasypanelForTests(undefined)
})

const verify = async () => {
  const res = await POST()
  return { status: res.status, body: await res.json() }
}

describe("POST /api/custom-domain/verify", () => {
  it("returns 401 without session and 404 without site", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await verify()).status).toBe(401)
    getServerSessionMock.mockResolvedValue(session)
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await verify()).status).toBe(404)
  })

  it("returns 503 when custom domains aren't configured", async () => {
    setEasypanelForTests(null)
    expect((await verify()).status).toBe(503)
    setEasypanelForTests(easypanel)
    vi.stubEnv("CUSTOM_DOMAIN_IP", "")
    expect((await verify()).status).toBe(503)
  })

  it("requires the site to be published", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ isActive: false })
    const { status, body } = await verify()
    expect(status).toBe(409)
    expect(body.error).toBe("Publique o site antes de conectar o domínio")
    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith({ where: { id: "profile-1" }, select: { isActive: true } })
  })

  it("returns 404 when the site has no domain", async () => {
    prismaMock.customDomain.findUnique.mockResolvedValue(null)
    expect((await verify()).status).toBe(404)
  })

  it("stays pending_dns with a pt-BR explanation when DNS isn't ready", async () => {
    dnsReady(false)
    const { status, body } = await verify()
    expect(status).toBe(200)
    expect(body.domain.status).toBe("pending_dns")
    expect(body.domain.error).toContain("_advlink.escritorio.adv.br")
    expect(body.domain.error).toContain(IP)
    expect(easypanel.calls).toEqual([])
    expect(prismaMock.customDomain.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: "profile-1" } }),
    )
  })

  it("registers the domain on Easypanel once DNS is ready, then waits for the certificate", async () => {
    dnsReady()
    const { body } = await verify()
    expect(easypanel.calls).toEqual(["findDomainByHost:escritorio.adv.br", "createDomain:escritorio.adv.br"])
    expect(body.domain.status).toBe("provisioning")
    expect(body.domain.error).toBe("Certificado sendo emitido, tente novamente em alguns minutos.")
    expect(current.easypanelDomainId).toBe("dom_fake0001")
    expect(fetchMock).toHaveBeenCalledWith("https://escritorio.adv.br/", expect.anything())
  })

  it("reuses an existing Easypanel domain for the host", async () => {
    dnsReady()
    easypanel.domains.dom_9 = { id: "dom_9", host: "escritorio.adv.br" }
    await verify()
    expect(easypanel.calls).toEqual(["findDomainByHost:escritorio.adv.br"])
    expect(current.easypanelDomainId).toBe("dom_9")
  })

  it("activates when HTTPS answers with the site header", async () => {
    dnsReady()
    current = row({ status: "provisioning", easypanelDomainId: "dom1" })
    fetchMock.mockResolvedValue(siteHeader("profile-1"))
    const { body } = await verify()
    expect(body.domain.status).toBe("active")
    expect(body.domain.activatedAt).toBeTruthy()
    expect(body.domain.error).toBeNull()
    expect(easypanel.calls).toEqual([])
  })

  it("does not activate on another site's header", async () => {
    dnsReady()
    current = row({ status: "provisioning", easypanelDomainId: "dom1" })
    fetchMock.mockResolvedValue(siteHeader("someone-else"))
    expect((await verify()).body.domain.status).toBe("provisioning")
  })

  it("marks the domain as error when Easypanel fails", async () => {
    dnsReady()
    easypanel.failNext = new Error("HTTP 500")
    const { status, body } = await verify()
    expect(status).toBe(200)
    expect(body.domain.status).toBe("error")
    expect(body.domain.error).toMatch(/Não foi possível registrar/)
  })

  it("returns an active domain untouched", async () => {
    current = row({ status: "active" })
    const { body } = await verify()
    expect(body.domain.status).toBe("active")
    expect(dnsMock.resolveTxt).not.toHaveBeenCalled()
  })

  it("rate limits per user (20/h)", async () => {
    dnsReady(false)
    for (let i = 0; i < 20; i++) expect((await verify()).status).toBe(200)
    expect((await verify()).status).toBe(429)
  })
})
