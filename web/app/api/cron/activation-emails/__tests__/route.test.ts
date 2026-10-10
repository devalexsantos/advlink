// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { dripMock } = vi.hoisted(() => ({ dripMock: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/activation/drip", () => ({ runActivationDrip: dripMock }))
vi.mock("@/lib/activation/sender", () => ({ sendActivationEmail: vi.fn() }))

import { GET, POST } from "../route"

const SECRET = "c".repeat(40)
const req = (auth?: string, method = "GET") =>
  new Request("https://app.advlink.site/api/cron/activation-emails", {
    method,
    headers: auth ? { authorization: auth } : {},
  })

describe("/api/cron/activation-emails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "info").mockImplementation(() => {})
    process.env.CRON_SECRET = SECRET
    dripMock.mockResolvedValue({ welcome: 2, checklist: 0, oab_tips: 0, last_reminder: 0, share_kit: 1 })
  })
  afterEach(() => {
    delete process.env.CRON_SECRET
    vi.restoreAllMocks()
  })

  it("503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET
    expect((await GET(req(`Bearer ${SECRET}`))).status).toBe(503)
  })

  it("401 with wrong or missing bearer", async () => {
    expect((await GET(req("Bearer wrong"))).status).toBe(401)
    expect((await GET(req())).status).toBe(401)
    expect(dripMock).not.toHaveBeenCalled()
  })

  it("200 with counts for GET and POST", async () => {
    const res = await GET(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ welcome: 2, share_kit: 1 })
    expect((await POST(req(`Bearer ${SECRET}`, "POST"))).status).toBe(200)
  })
})
