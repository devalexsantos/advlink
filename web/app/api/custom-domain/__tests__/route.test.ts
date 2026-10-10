// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Prisma } from "@prisma/client"
import { FakeEasypanel } from "@/lib/easypanel-fake"
import { setEasypanelForTests } from "@/lib/easypanel"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    customDomain: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { GET, PUT, DELETE } from "@/app/api/custom-domain/route"

const session = { user: { id: "user-1" } }
const IP = "203.0.113.10"

function row(over: Record<string, unknown> = {}) {
  return {
    id: "cd1",
    profileId: "profile-1",
    host: "escritorio.adv.br",
    status: "pending_dns",
    verifyToken: "tok",
    easypanelDomainId: null,
    lastCheckedAt: null,
    activatedAt: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

const put = (body: unknown) =>
  PUT(new Request("http://localhost/api/custom-domain", { method: "PUT", body: JSON.stringify(body) }))

/** findUnique is called with { where: { host } } or { where: { profileId } }. */
function domains({ byHost = null, byProfile = null }: { byHost?: unknown; byProfile?: unknown }) {
  prismaMock.customDomain.findUnique.mockImplementation(async ({ where }: { where: { host?: string } }) =>
    where.host ? byHost : byProfile,
  )
}

let easypanel: FakeEasypanel

beforeEach(() => {
  vi.clearAllMocks()
  getServerSessionMock.mockResolvedValue(session)
  getActiveSiteIdMock.mockResolvedValue("profile-1")
  vi.stubEnv("ROOT_DOMAIN", "advlink.site")
  vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "")
  vi.stubEnv("CUSTOM_DOMAIN_IP", IP)
  easypanel = new FakeEasypanel()
  setEasypanelForTests(easypanel)
  prismaMock.customDomain.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => row(create))
  prismaMock.customDomain.deleteMany.mockResolvedValue({ count: 1 })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  setEasypanelForTests(undefined)
})

describe("auth and site scope", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect((await put({ host: "a.com.br" })).status).toBe(401)
    expect((await DELETE()).status).toBe(401)
  })

  it("returns 404 without an active site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(404)
    expect((await put({ host: "a.com.br" })).status).toBe(404)
    expect((await DELETE()).status).toBe(404)
  })
})

describe("GET /api/custom-domain", () => {
  it("returns null and the configuration flag", async () => {
    domains({})
    const res = await GET()
    expect(await res.json()).toEqual({ domain: null, configured: true })
    expect(prismaMock.customDomain.findUnique).toHaveBeenCalledWith({ where: { profileId: "profile-1" } })
  })

  it("is not configured without the VPS IP or Easypanel", async () => {
    domains({})
    vi.stubEnv("CUSTOM_DOMAIN_IP", "")
    expect((await (await GET()).json()).configured).toBe(false)
    vi.stubEnv("CUSTOM_DOMAIN_IP", IP)
    setEasypanelForTests(null)
    expect((await (await GET()).json()).configured).toBe(false)
  })

  it("returns the domain contract without internal ids", async () => {
    domains({ byProfile: row({ easypanelDomainId: "dom_x", error: "x" }) })
    const { domain } = await (await GET()).json()
    expect(domain).toEqual({
      host: "escritorio.adv.br",
      status: "pending_dns",
      verifyToken: "tok",
      txtName: "_advlink.escritorio.adv.br",
      txtValue: "advlink-verify=tok",
      targetIp: IP,
      error: "x",
      activatedAt: null,
      lastCheckedAt: null,
    })
    expect(domain).not.toHaveProperty("easypanelDomainId")
    expect(domain).not.toHaveProperty("profileId")
  })
})

describe("PUT /api/custom-domain", () => {
  it.each([{}, { host: "" }, { host: "joao.advlink.site" }, { host: "localhost" }, { host: "1.2.3.4" }, null])(
    "returns 400 for %j",
    async (body) => {
      domains({})
      const res = await put(body)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: "Domínio inválido" })
    },
  )

  it("returns 409 when another site owns the host", async () => {
    domains({ byHost: { profileId: "other-profile" } })
    const res = await put({ host: "escritorio.adv.br" })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "Este domínio já está em uso" })
    expect(prismaMock.customDomain.upsert).not.toHaveBeenCalled()
  })

  it("creates a pending domain with a fresh token, normalizing the host", async () => {
    domains({})
    const res = await put({ host: "https://WWW.Escritorio.adv.br/" })
    expect(res.status).toBe(200)
    const { domain } = await res.json()
    expect(domain).toMatchObject({ host: "www.escritorio.adv.br", status: "pending_dns" })
    const arg = prismaMock.customDomain.upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ profileId: "profile-1" })
    expect(arg.create).toMatchObject({ profileId: "profile-1", host: "www.escritorio.adv.br", easypanelDomainId: null })
    expect(arg.create.verifyToken).toMatch(/^[0-9a-f]{32}$/)
    expect(domain.txtValue).toBe(`advlink-verify=${arg.create.verifyToken}`)
  })

  it("keeps the current token when the same host is submitted again", async () => {
    const current = row({ status: "active" })
    domains({ byHost: { profileId: "profile-1" }, byProfile: current })
    const { domain } = await (await put({ host: "escritorio.adv.br" })).json()
    expect(domain).toMatchObject({ host: "escritorio.adv.br", status: "active", verifyToken: "tok" })
    expect(prismaMock.customDomain.upsert).not.toHaveBeenCalled()
  })

  it("replaces the previous domain, removing it from Easypanel first", async () => {
    domains({ byProfile: row({ host: "antigo.com.br", easypanelDomainId: "dom_old", status: "active" }) })
    const res = await put({ host: "novo.com.br" })
    expect(res.status).toBe(200)
    expect(easypanel.calls).toEqual(["deleteDomain:dom_old"])
    expect(prismaMock.customDomain.upsert.mock.calls[0][0].update).toMatchObject({
      host: "novo.com.br",
      status: "pending_dns",
      easypanelDomainId: null,
      activatedAt: null,
    })
  })

  it("returns 502 and keeps the old domain when Easypanel fails", async () => {
    domains({ byProfile: row({ host: "antigo.com.br", easypanelDomainId: "dom_old" }) })
    easypanel.failNext = new Error("HTTP 500")
    const res = await put({ host: "novo.com.br" })
    expect(res.status).toBe(502)
    expect(prismaMock.customDomain.upsert).not.toHaveBeenCalled()
  })

  it("maps a unique-constraint race to 409", async () => {
    domains({})
    prismaMock.customDomain.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
    )
    expect((await put({ host: "a.com.br" })).status).toBe(409)
  })
})

describe("DELETE /api/custom-domain", () => {
  it("is a no-op without a domain", async () => {
    domains({})
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(prismaMock.customDomain.deleteMany).not.toHaveBeenCalled()
  })

  it("removes the domain from Easypanel and deletes only this site's row", async () => {
    domains({ byProfile: row({ easypanelDomainId: "dom1" }) })
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(easypanel.calls).toEqual(["deleteDomain:dom1"])
    expect(prismaMock.customDomain.deleteMany).toHaveBeenCalledWith({ where: { profileId: "profile-1" } })
  })

  it("returns 502 when Easypanel can't remove it", async () => {
    domains({ byProfile: row({ easypanelDomainId: "dom1" }) })
    easypanel.failNext = new Error("timeout")
    expect((await DELETE()).status).toBe(502)
    expect(prismaMock.customDomain.deleteMany).not.toHaveBeenCalled()
  })
})
