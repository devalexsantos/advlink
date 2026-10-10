// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { runActivationDrip } from "../drip"

const NOW = new Date("2026-10-20T12:00:00Z")
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const H = 3600_000
const D = 24 * H

type TestUser = {
  id: string
  email: string | null
  name: string | null
  createdAt: Date
  emailSends: { kind: string }[]
  profiles: { id: string; slug: string; isActive: boolean; firstPublishedAt: Date | null }[]
}
const user = (over: Partial<TestUser> = {}): TestUser => ({
  id: "u1",
  email: "a@b.com",
  name: "Ana",
  createdAt: ago(2 * H),
  emailSends: [],
  profiles: [{ id: "p1", slug: "ana", isActive: false, firstPublishedAt: null }],
  ...over,
})

function setup(signup: TestUser[], published: TestUser[] = []) {
  const prisma = {
    user: { findMany: vi.fn().mockResolvedValueOnce(signup).mockResolvedValueOnce(published) },
    emailSend: {
      create: vi.fn().mockResolvedValue({ id: "rec1" }),
      delete: vi.fn().mockResolvedValue({}),
    },
  }
  const send = vi.fn().mockResolvedValue(undefined)
  const run = (limit?: number) => runActivationDrip({ now: NOW, prisma: prisma as never, send, limit })
  return { prisma, send, run }
}

const kindsSent = (send: ReturnType<typeof vi.fn>) => send.mock.calls.map((c) => c[0].kind)

describe("runActivationDrip", () => {
  beforeEach(() => {
    process.env.ACTIVATION_DRIP_START = "2026-10-01T00:00:00Z"
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    delete process.env.ACTIVATION_DRIP_START
    vi.restoreAllMocks()
  })

  it("sends nothing without ACTIVATION_DRIP_START", async () => {
    delete process.env.ACTIVATION_DRIP_START
    const { prisma, send, run } = setup([user()])
    const counts = await run()
    expect(prisma.user.findMany).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
    expect(counts.welcome).toBe(0)
  })

  it("applies the start date and opt-out in the query", async () => {
    const { prisma, run } = setup([])
    await run()
    const where = prisma.user.findMany.mock.calls[0][0].where
    expect(where.marketingEmailsOptOutAt).toBeNull()
    expect(where.createdAt.gte).toEqual(new Date("2026-10-11T12:00:00Z")) // now - 9d is later than start
    expect(prisma.user.findMany.mock.calls[1][0].where.createdAt.gte).toEqual(new Date("2026-10-01T00:00:00Z"))
  })

  it("welcome only, 2h after signup", async () => {
    const { send, run } = setup([user()])
    const counts = await run()
    expect(kindsSent(send)).toEqual(["welcome"])
    expect(counts.welcome).toBe(1)
  })

  it("does not send welcome before 1h or after 3 days", async () => {
    const { send, run } = setup([user({ createdAt: ago(30 * 60_000) }), user({ id: "u2", createdAt: ago(4 * D) })])
    await run()
    expect(kindsSent(send)).not.toContain("welcome")
  })

  it("day 1 sends checklist (and welcome, if not yet sent)", async () => {
    const { send, run } = setup([user({ createdAt: ago(1 * D + H) })])
    await run()
    expect(kindsSent(send)).toEqual(["welcome", "checklist"])
  })

  it("day 3 sends oab_tips only, day 8 only last_reminder", async () => {
    const a = setup([user({ createdAt: ago(3 * D + H) })])
    await a.run()
    expect(kindsSent(a.send)).toEqual(["oab_tips"])
    const b = setup([user({ createdAt: ago(8 * D) })])
    await b.run()
    expect(kindsSent(b.send)).toEqual(["last_reminder"])
  })

  it("nothing after the last window", async () => {
    const { send, run } = setup([user({ createdAt: ago(10 * D) })])
    await run()
    expect(send).not.toHaveBeenCalled()
  })

  it("published users only get welcome", async () => {
    const pub = user({
      createdAt: ago(1 * D + H),
      profiles: [{ id: "p1", slug: "ana", isActive: true, firstPublishedAt: ago(H) }],
    })
    const { send, run } = setup([pub])
    await run()
    expect(kindsSent(send)).toEqual(["welcome"])
  })

  it("share_kit 1 day after the oldest firstPublishedAt, with siteId", async () => {
    const u = user({
      createdAt: ago(5 * D),
      profiles: [
        { id: "p2", slug: "novo", isActive: true, firstPublishedAt: ago(1 * D + H) },
        { id: "p1", slug: "ana", isActive: true, firstPublishedAt: ago(2 * D) },
      ],
    })
    const { send, run, prisma } = setup([], [u])
    const counts = await run()
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ kind: "share_kit", siteId: "p1", siteSlug: "ana" }))
    expect(prisma.emailSend.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: "u1", kind: "share_kit", siteId: "p1" } }))
    expect(counts.share_kit).toBe(1)
  })

  it("share_kit not sent before 1 day or after 7 days", async () => {
    const mk = (age: number) =>
      user({ profiles: [{ id: "p1", slug: "a", isActive: true, firstPublishedAt: ago(age) }] })
    const { send, run } = setup([], [mk(12 * H), mk(8 * D)])
    await run()
    expect(send).not.toHaveBeenCalled()
  })

  it("skips kinds already recorded and users without e-mail", async () => {
    const { send, run } = setup([user({ emailSends: [{ kind: "welcome" }] }), user({ id: "u2", email: null })])
    await run()
    expect(send).not.toHaveBeenCalled()
  })

  it("skips silently on unique violation (P2002)", async () => {
    const { prisma, send, run } = setup([user()])
    prisma.emailSend.create.mockRejectedValue({ code: "P2002" })
    const counts = await run()
    expect(send).not.toHaveBeenCalled()
    expect(counts.welcome).toBe(0)
  })

  it("rolls back the record when sending fails and keeps going", async () => {
    const { prisma, send, run } = setup([user(), user({ id: "u2", email: "c@d.com" })])
    send.mockRejectedValueOnce(new Error("boom"))
    const counts = await run()
    expect(prisma.emailSend.delete).toHaveBeenCalledWith({ where: { id: "rec1" } })
    expect(counts.welcome).toBe(1)
  })

  it("respects the batch limit", async () => {
    const users = Array.from({ length: 5 }, (_, i) => user({ id: `u${i}`, email: `${i}@x.com` }))
    const { send, run } = setup(users)
    await run(3)
    expect(send).toHaveBeenCalledTimes(3)
  })
})
