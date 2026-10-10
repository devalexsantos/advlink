// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getEasypanel, setEasypanelForTests } from "@/lib/easypanel"

const TOKEN = "secret-token-123"
const fetchMock = vi.fn()

function env(vars: Record<string, string> = {}) {
  vi.stubEnv("EASYPANEL_URL", "https://panel.example.com/")
  vi.stubEnv("EASYPANEL_API_TOKEN", TOKEN)
  vi.stubEnv("EASYPANEL_PROJECT", "advlink")
  vi.stubEnv("EASYPANEL_SERVICE", "web")
  vi.stubEnv("EASYPANEL_API_PREFIX", "")
  vi.stubEnv("EASYPANEL_SERVICE_PORT", "")
  vi.stubEnv("EASYPANEL_CERT_RESOLVER", "")
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  setEasypanelForTests(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  setEasypanelForTests(undefined)
})

describe("getEasypanel", () => {
  it("returns null when any required env var is missing", () => {
    env({ EASYPANEL_API_TOKEN: "" })
    expect(getEasypanel()).toBeNull()
  })

  it("creates a domain on the configured service with Let's Encrypt", async () => {
    env()
    fetchMock.mockResolvedValue(json({ id: "dom1", host: "escritorio.adv.br" }))
    await expect(getEasypanel()!.createDomain("escritorio.adv.br")).resolves.toEqual({ id: "dom1" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://panel.example.com/api/createDomain")
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(JSON.parse(init.body)).toEqual({
      host: "escritorio.adv.br",
      https: true,
      path: "/",
      wildcard: false,
      certificateResolver: "letsencrypt",
      middlewares: [],
      destinationType: "service",
      serviceDestination: { projectName: "advlink", serviceName: "web", port: 3000, protocol: "http" },
    })
  })

  it("honours prefix, port and resolver overrides and finds the id under result/json", async () => {
    env({ EASYPANEL_API_PREFIX: "/api/trpc/", EASYPANEL_SERVICE_PORT: "80", EASYPANEL_CERT_RESOLVER: "le" })
    fetchMock.mockResolvedValue(json({ result: { data: { json: { id: "dom2" } } } }))
    await expect(getEasypanel()!.createDomain("a.com.br")).resolves.toEqual({ id: "dom2" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://panel.example.com/api/trpc/createDomain")
    const body = JSON.parse(init.body)
    expect(body.certificateResolver).toBe("le")
    expect(body.serviceDestination.port).toBe(80)
  })

  it("falls back to listDomains when create returns no id", async () => {
    env()
    fetchMock
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json([{ id: "dom3", host: "a.com.br" }]))
    await expect(getEasypanel()!.createDomain("a.com.br")).resolves.toEqual({ id: "dom3" })
  })

  it("finds a domain by host through listDomains", async () => {
    env()
    fetchMock.mockResolvedValue(json({ result: [{ id: "x", host: "other.com" }, { id: "y", host: "A.com.br" }] }))
    const ep = getEasypanel()!
    await expect(ep.findDomainByHost("a.com.br")).resolves.toEqual({ id: "y" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://panel.example.com/api/listDomains?projectName=advlink&serviceName=web")
    expect(init.method).toBe("GET")
    fetchMock.mockResolvedValue(json([]))
    await expect(ep.findDomainByHost("a.com.br")).resolves.toBeNull()
  })

  it("deletes a domain by id", async () => {
    env()
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    await getEasypanel()!.deleteDomain("dom1")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://panel.example.com/api/deleteDomain")
    expect(JSON.parse(init.body)).toEqual({ id: "dom1" })
  })

  it("throws a short error without the token on non-2xx", async () => {
    env()
    fetchMock.mockResolvedValue(new Response("forbidden", { status: 403 }))
    const err = await getEasypanel()!.deleteDomain("dom1").catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toContain("HTTP 403")
    expect(err.message).not.toContain(TOKEN)
  })

  it("wraps network failures", async () => {
    env()
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))
    await expect(getEasypanel()!.deleteDomain("dom1")).rejects.toThrow("falha de rede")
  })
})
