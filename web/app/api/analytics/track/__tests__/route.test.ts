// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findFirst: vi.fn() },
    pageView: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("geoip-lite", () => ({ default: { lookup: vi.fn().mockReturnValue({ country: "BR", city: "São Paulo", region: "SP" }) } }))

import { POST } from "@/app/api/analytics/track/route"
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
    vi.clearAllMocks()
    prismaMock.profile.findFirst.mockResolvedValue({ id: "p1" })
    prismaMock.pageView.findFirst.mockResolvedValue(null)
    prismaMock.pageView.create.mockResolvedValue({ id: "pv1" })
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
})
