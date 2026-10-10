// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock, trackEventMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findUnique: vi.fn() },
    previewLink: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
  trackEventMock: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))

import { POST } from "@/app/api/preview-link/route"
import { resetRateLimiters } from "@/lib/rate-limit"

const DAY = 24 * 60 * 60 * 1000

describe("POST /api/preview-link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://app.advlink.site")
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getActiveSiteIdMock.mockResolvedValue("profile-1")
    prismaMock.profile.findUnique.mockResolvedValue({ suspendedByAdmin: false })
    prismaMock.previewLink.findFirst.mockResolvedValue(null)
    prismaMock.previewLink.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.previewLink.create.mockImplementation(async ({ data }) => ({ token: data.token, expiresAt: data.expiresAt }))
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await POST()).status).toBe(401)
    expect(prismaMock.previewLink.create).not.toHaveBeenCalled()
  })

  it("returns 404 without an active site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await POST()).status).toBe(404)
  })

  it("returns 403 for a site suspended by the admin", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({ suspendedByAdmin: true })
    expect((await POST()).status).toBe(403)
    expect(prismaMock.previewLink.create).not.toHaveBeenCalled()
  })

  it("creates a 7-day link for the active site on the app origin", async () => {
    const before = Date.now()
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()

    const { data } = prismaMock.previewLink.create.mock.calls[0][0]
    expect(data.profileId).toBe("profile-1")
    expect(data.token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    const ttl = data.expiresAt.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(7 * DAY - 1000)
    expect(ttl).toBeLessThanOrEqual(7 * DAY + 1000)

    expect(body.url).toBe(`https://app.advlink.site/previa/${data.token}`)
    expect(body.expiresAt).toBe(data.expiresAt.toISOString())
    expect(prismaMock.previewLink.deleteMany).toHaveBeenCalledWith({ where: { profileId: "profile-1", expiresAt: { lte: expect.any(Date) } } })
    expect(trackEventMock).toHaveBeenCalledWith("preview_shared", { userId: "user-1", siteId: "profile-1", meta: { reused: false } })
  })

  it("reuses a link of the same site that is still valid for more than a day", async () => {
    const expiresAt = new Date(Date.now() + 5 * DAY)
    prismaMock.previewLink.findFirst.mockResolvedValue({ token: "existing-token", expiresAt })
    const body = await (await POST()).json()
    expect(body).toEqual({ url: "https://app.advlink.site/previa/existing-token", expiresAt: expiresAt.toISOString() })
    expect(prismaMock.previewLink.create).not.toHaveBeenCalled()
    const where = prismaMock.previewLink.findFirst.mock.calls[0][0].where
    expect(where.profileId).toBe("profile-1")
    expect(where.expiresAt.gt.getTime()).toBeGreaterThan(Date.now() + DAY - 1000)
    expect(trackEventMock).toHaveBeenCalledWith("preview_shared", expect.objectContaining({ meta: { reused: true } }))
  })

  it("returns 429 after too many requests", async () => {
    for (let i = 0; i < 20; i++) expect((await POST()).status).toBe(200)
    const res = await POST()
    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
  })
})
