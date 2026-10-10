// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { lead: { deleteMany: vi.fn() } },
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
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
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
    expect(await res.json()).toEqual({ leadsPurged: 4 })
    expect(prismaMock.lead.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-07-12T12:00:00Z") } },
    })
    expect((await POST(req(`Bearer ${SECRET}`, "POST"))).status).toBe(200)
  })
})
