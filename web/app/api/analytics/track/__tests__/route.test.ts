// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findFirst: vi.fn() },
    pageView: { findFirst: vi.fn(), create: vi.fn() },
    contactClick: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("geoip-lite", () => ({ default: { lookup: vi.fn().mockReturnValue({ country: "BR", city: "São Paulo", region: "SP" }) } }))

import { POST } from "@/app/api/analytics/track/route"
import { resetRateLimiters } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

function makeReq(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/analytics/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      "x-forwarded-for": "189.1.2.3",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/analytics/track", () => {
  beforeEach(() => {
    resetRateLimiters()
    vi.clearAllMocks()
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1" })
    prismaMock.pageView.findFirst.mockResolvedValue(null)
    prismaMock.pageView.create.mockResolvedValue({ id: "pv1" })
    prismaMock.contactClick.findFirst.mockResolvedValue(null)
    prismaMock.contactClick.create.mockResolvedValue({ id: "cc1" })
  })

  it("returns 400 without slug", async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it("returns 404 for unknown slug", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const res = await POST(makeReq({ slug: "nonexistent" }))
    expect(res.status).toBe(404)
  })

  it("filters bot user agents", async () => {
    const res = await POST(makeReq({ slug: "test" }, { "user-agent": "Googlebot/2.1" }))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(prismaMock.pageView.create).not.toHaveBeenCalled()
  })

  it("creates page view for valid request", async () => {
    const res = await POST(makeReq({ slug: "test", referrer: "https://google.com", path: "/" }))
    expect(res.status).toBe(200)
    expect(prismaMock.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profileId: "p1",
          referrer: "Google",
          deviceType: "desktop",
          browser: "Chrome",
        }),
      })
    )
  })

  it("deduplicates within 30 minutes", async () => {
    prismaMock.pageView.findFirst.mockResolvedValue({ id: "existing" })
    const res = await POST(makeReq({ slug: "test" }))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(prismaMock.pageView.create).not.toHaveBeenCalled()
  })

  it("classifies mobile device", async () => {
    const res = await POST(makeReq({ slug: "test" }, { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1" }))
    expect(prismaMock.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deviceType: "mobile",
          browser: "Safari",
        }),
      })
    )
  })

  it("classifies referrer sources", async () => {
    // WhatsApp
    const res = await POST(makeReq({ slug: "test", referrer: "https://wa.me/5511" }))
    expect(prismaMock.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referrer: "WhatsApp" }),
      })
    )
  })

  it("returns 'Outro' browser for unknown user-agent", async () => {
    const res = await POST(makeReq({ slug: "test" }, { "user-agent": "SomeCustomApp/1.0" }))
    expect(res.status).toBe(200)
    expect(prismaMock.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          browser: "Outro",
        }),
      })
    )
  })

  it("returns 'Outro' referrer for unknown referrer source", async () => {
    const res = await POST(makeReq({ slug: "test", referrer: "https://some-random-site.xyz/page" }))
    expect(res.status).toBe(200)
    expect(prismaMock.pageView.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referrer: "Outro",
        }),
      })
    )
  })

  it("returns 500 when an unexpected error occurs", async () => {
    prismaMock.profile.findFirst.mockRejectedValue(new Error("DB connection lost"))
    const res = await POST(makeReq({ slug: "test" }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.ok).toBe(false)
  })

  it("hashes the trusted proxy IP, not the spoofable first X-Forwarded-For hop", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1" })
    prismaMock.pageView.findFirst.mockResolvedValue(null)
    await POST(makeReq({ slug: "x" }, { "x-forwarded-for": "1.1.1.1, 189.1.2.3" }))
    await POST(makeReq({ slug: "x" }, { "x-forwarded-for": "9.9.9.9, 189.1.2.3" }))
    const [a, b] = prismaMock.pageView.create.mock.calls.map((c) => c[0].data.visitorHash)
    expect(a).toBe(b)
  })

  it("stops recording after 60 beacons per IP and slug in an hour", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1" })
    prismaMock.pageView.findFirst.mockResolvedValue(null)
    for (let i = 0; i < 61; i++) await POST(makeReq({ slug: "x" }))
    expect(prismaMock.pageView.create).toHaveBeenCalledTimes(60)
  })

  describe("contact clicks", () => {
    beforeEach(() => {
      prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", isActive: true })
    })

    it("records a click with only profile, channel and daily visitor hash", async () => {
      const res = await POST(makeReq({ slug: "joao", type: "contact", kind: "whatsapp" }))
      expect(res.status).toBe(200)
      expect(prismaMock.contactClick.create).toHaveBeenCalledTimes(1)
      const { data } = prismaMock.contactClick.create.mock.calls[0][0]
      expect(Object.keys(data).sort()).toEqual(["kind", "profileId", "visitorHash"])
      expect(data).toMatchObject({ profileId: "p1", kind: "whatsapp" })
      expect(data.visitorHash).toMatch(/^[0-9a-f]{16}$/)
      expect(prismaMock.pageView.create).not.toHaveBeenCalled()
    })

    it.each(["phone", "email", "link"])("accepts kind %s", async (kind) => {
      const res = await POST(makeReq({ slug: "joao", type: "contact", kind }))
      expect(res.status).toBe(200)
      expect(prismaMock.contactClick.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind }),
      })
    })

    it.each([undefined, "sms", "", 42])("returns 400 for invalid kind %s", async (kind) => {
      const res = await POST(makeReq({ slug: "joao", type: "contact", kind }))
      expect(res.status).toBe(400)
      expect(prismaMock.contactClick.create).not.toHaveBeenCalled()
    })

    it("does not record clicks on unpublished sites", async () => {
      prismaMock.profile.findFirst.mockResolvedValue({ id: "p1", isActive: false })
      const res = await POST(makeReq({ slug: "joao", type: "contact", kind: "phone" }))
      expect(res.status).toBe(200)
      expect(prismaMock.contactClick.create).not.toHaveBeenCalled()
    })

    it("returns 404 for unknown slug", async () => {
      prismaMock.profile.findFirst.mockResolvedValue(null)
      const res = await POST(makeReq({ slug: "x", type: "contact", kind: "phone" }))
      expect(res.status).toBe(404)
    })

    it("filters bots", async () => {
      await POST(makeReq({ slug: "joao", type: "contact", kind: "email" }, { "user-agent": "Googlebot/2.1" }))
      expect(prismaMock.contactClick.create).not.toHaveBeenCalled()
    })

    it("dedupes the same visitor + channel + site within 30 minutes", async () => {
      prismaMock.contactClick.findFirst.mockResolvedValue({ id: "existing" })
      const before = Date.now()
      const res = await POST(makeReq({ slug: "joao", type: "contact", kind: "whatsapp" }))
      expect(res.status).toBe(200)
      expect(prismaMock.contactClick.create).not.toHaveBeenCalled()
      const { where } = prismaMock.contactClick.findFirst.mock.calls[0][0]
      expect(where).toMatchObject({ profileId: "p1", kind: "whatsapp" })
      expect(where.visitorHash).toMatch(/^[0-9a-f]{16}$/)
      const windowMs = before - where.createdAt.gte.getTime()
      expect(windowMs).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000)
      expect(windowMs).toBeLessThanOrEqual(30 * 60 * 1000 + 1000)
    })

    it("uses the same daily visitor hash as page views", async () => {
      await POST(makeReq({ slug: "joao" }))
      await POST(makeReq({ slug: "joao", type: "contact", kind: "link" }))
      const pvHash = prismaMock.pageView.create.mock.calls[0][0].data.visitorHash
      const ccHash = prismaMock.contactClick.create.mock.calls[0][0].data.visitorHash
      expect(ccHash).toBe(pvHash)
    })

    it("stops recording after 30 clicks per IP and slug in an hour, without touching the page view budget", async () => {
      for (let i = 0; i < 31; i++) await POST(makeReq({ slug: "joao", type: "contact", kind: "link" }))
      expect(prismaMock.contactClick.create).toHaveBeenCalledTimes(30)
      await POST(makeReq({ slug: "joao" }))
      expect(prismaMock.pageView.create).toHaveBeenCalledTimes(1)
    })
  })
})
