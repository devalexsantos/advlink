// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { FakeEasypanel } from "@/lib/easypanel-fake"
import { setEasypanelForTests } from "@/lib/easypanel"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    lead: { deleteMany: vi.fn() },
    customDomain: { findMany: vi.fn(), update: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET, POST } from "@/app/api/cron/maintenance/route"

const SECRET = "s".repeat(40)
const req = (auth?: string, method = "GET") =>
  new Request("http://localhost/api/cron/maintenance", { method, headers: auth ? { authorization: auth } : {} })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("CRON_SECRET", SECRET)
  prismaMock.lead.deleteMany.mockResolvedValue({ count: 4 })
  prismaMock.customDomain.findMany.mockResolvedValue([])
  prismaMock.customDomain.update.mockResolvedValue({})
  setEasypanelForTests(null)
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  setEasypanelForTests(undefined)
})

describe("/api/cron/maintenance", () => {
  it("returns 503 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "")
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503)
    expect(prismaMock.lead.deleteMany).not.toHaveBeenCalled()
  })

  it("returns 401 with a wrong or missing bearer", async () => {
    expect((await GET(req("Bearer nope"))).status).toBe(401)
    expect((await GET(req())).status).toBe(401)
    expect(prismaMock.lead.deleteMany).not.toHaveBeenCalled()
  })

  it("purges leads older than 90 days (GET and POST)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"))
    const res = await GET(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ leadsPurged: 4, domainsActivated: 0, domainsRemoved: 0, domainsChecked: 0 })
    expect(prismaMock.lead.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-07-12T12:00:00Z") } },
    })
    expect((await POST(req(`Bearer ${SECRET}`, "POST"))).status).toBe(200)
  })

  describe("custom domains", () => {
    let easypanel: FakeEasypanel
    const fetchMock = vi.fn()

    beforeEach(() => {
      easypanel = new FakeEasypanel()
      setEasypanelForTests(easypanel)
      vi.stubGlobal("fetch", fetchMock)
      fetchMock.mockReset()
    })

    /** First findMany = unpublished sites, second = provisioning domains. */
    function domains(unpublished: unknown[], provisioning: unknown[]) {
      prismaMock.customDomain.findMany.mockResolvedValueOnce(unpublished).mockResolvedValueOnce(provisioning)
    }

    it("skips the step when Easypanel isn't configured", async () => {
      setEasypanelForTests(null)
      const body = await (await GET(req(`Bearer ${SECRET}`))).json()
      expect(body).toMatchObject({ domainsActivated: 0, domainsRemoved: 0, domainsChecked: 0 })
      expect(prismaMock.customDomain.findMany).not.toHaveBeenCalled()
    })

    it("activates provisioning domains whose HTTPS answers with the site header", async () => {
      domains([], [
        { id: "d1", host: "a.com.br", profileId: "p1" },
        { id: "d2", host: "b.com.br", profileId: "p2" },
      ])
      fetchMock.mockImplementation(async (url: string) =>
        new Response("ok", { headers: url.includes("a.com.br") ? { "x-advlink-site": "p1" } : {} }),
      )
      const body = await (await GET(req(`Bearer ${SECRET}`))).json()
      expect(body).toMatchObject({ domainsActivated: 1, domainsChecked: 2, domainsRemoved: 0 })
      expect(prismaMock.customDomain.update).toHaveBeenCalledWith({
        where: { id: "d1" },
        data: expect.objectContaining({ status: "active", error: null }),
      })
      expect(prismaMock.customDomain.update).toHaveBeenCalledWith({
        where: { id: "d2" },
        data: { lastCheckedAt: expect.any(Date) },
      })
      const provisioningQuery = prismaMock.customDomain.findMany.mock.calls[1][0]
      expect(provisioningQuery.where).toEqual({ status: "provisioning", profile: { isActive: true } })
      expect(provisioningQuery.take).toBe(50)
    })

    it("removes domains of canceled or admin-suspended sites, keeping the row as error", async () => {
      domains([
        { id: "d1", host: "a.com.br", easypanelDomainId: "dom1" },
        { id: "d2", host: "b.com.br", easypanelDomainId: "dom2" },
        { id: "d3", host: "c.com.br", easypanelDomainId: null },
      ], [])
      easypanel.domains.dom1 = { id: "dom1", host: "a.com.br" }
      const deleteSpy = vi.spyOn(easypanel, "deleteDomain")
      deleteSpy.mockImplementation(async (id: string) => {
        if (id === "dom2") throw new Error("HTTP 500")
      })
      const body = await (await GET(req(`Bearer ${SECRET}`))).json()
      // dom2 failed: counted out, the others still processed
      expect(body).toMatchObject({ domainsRemoved: 2 })
      const query = prismaMock.customDomain.findMany.mock.calls[0][0]
      expect(query.where).toEqual({
        status: { in: ["active", "provisioning"] },
        profile: { OR: [{ billingStatus: "CANCELED" }, { suspendedByAdmin: true }] },
      })
      expect(query.take).toBe(50)
      expect(prismaMock.customDomain.update).toHaveBeenCalledWith({
        where: { id: "d1" },
        data: expect.objectContaining({ status: "error", error: "Site despublicado", easypanelDomainId: null }),
      })
      expect(prismaMock.customDomain.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "d2" } }))
    })
  })
})
