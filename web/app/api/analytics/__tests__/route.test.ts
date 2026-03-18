// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { getServerSessionMock, prismaMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  prismaMock: {
    profile: {
      findFirst: vi.fn(),
    },
    pageView: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/analytics/route"

const session = { user: { id: "user-1" } }
const profileId = "profile-abc"

// Use NextRequest so req.nextUrl.searchParams is available (the route accesses it directly)
const makeRequest = (params = "") => {
  const url = `http://localhost/api/analytics${params ? `?${params}` : ""}`
  return new NextRequest(url)
}

// Helper to build the default happy-path mocks
const setupHappyPath = () => {
  prismaMock.profile.findFirst.mockResolvedValue({ id: profileId })
  prismaMock.pageView.count.mockResolvedValue(120)
  // $queryRaw is called 3 times: uniqueVisitors, hourly, daily
  prismaMock.$queryRaw
    .mockResolvedValueOnce([{ count: BigInt(45) }])   // uniqueVisitors
    .mockResolvedValueOnce([                            // hourly
      { hour: 9, count: BigInt(10) },
      { hour: 14, count: BigInt(20) },
    ])
    .mockResolvedValueOnce([                            // daily
      { day: "2026-03-01", count: BigInt(15) },
      { day: "2026-03-02", count: BigInt(25) },
    ])
  prismaMock.pageView.groupBy
    .mockResolvedValueOnce([                            // sources
      { referrer: "google.com", _count: 50 },
      { referrer: null, _count: 30 },
    ])
    .mockResolvedValueOnce([                            // devices
      { deviceType: "mobile", _count: 70 },
      { deviceType: null, _count: 10 },
    ])
    .mockResolvedValueOnce([                            // browsers
      { browser: "Chrome", _count: 80 },
      { browser: null, _count: 5 },
    ])
    .mockResolvedValueOnce([                            // countries
      { country: "BR", _count: 90 },
    ])
    .mockResolvedValueOnce([                            // cities
      { city: "São Paulo", _count: 60 },
      { city: null, _count: 8 },
    ])
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns 401 when session has no userId", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} })
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("returns 404 when user has no profile", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("Perfil não encontrado")
  })

  it("looks up profile by userId from session", async () => {
    setupHappyPath()
    await GET(makeRequest())
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
  })

  it("returns 200 with analytics data on happy path", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  it("returns totalViews from pageView.count", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.totalViews).toBe(120)
  })

  it("converts BigInt uniqueVisitors to number", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.uniqueVisitors).toBe(45)
    expect(typeof data.uniqueVisitors).toBe("number")
  })

  it("returns 0 for uniqueVisitors when queryRaw returns empty array", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: profileId })
    prismaMock.pageView.count.mockResolvedValue(0)
    prismaMock.$queryRaw
      .mockResolvedValueOnce([])   // empty uniqueVisitors result
      .mockResolvedValueOnce([])   // hourly
      .mockResolvedValueOnce([])   // daily
    prismaMock.pageView.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.uniqueVisitors).toBe(0)
  })

  it("converts null referrer to 'Direto' in sources", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    const nullSource = data.sources.find((s: { source: string }) => s.source === "Direto")
    expect(nullSource).toBeDefined()
    expect(nullSource.count).toBe(30)
  })

  it("maps referrer value to source field in sources", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.sources).toContainEqual({ source: "google.com", count: 50 })
  })

  it("converts null deviceType to 'desktop' in devices", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    const nullDevice = data.devices.find((d: { type: string }) => d.type === "desktop")
    expect(nullDevice).toBeDefined()
    expect(nullDevice.count).toBe(10)
  })

  it("converts null browser to 'Outro' in browsers", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    const nullBrowser = data.browsers.find((b: { name: string }) => b.name === "Outro")
    expect(nullBrowser).toBeDefined()
  })

  it("converts null city to 'Desconhecida' in cities", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    const unknownCity = data.cities.find((c: { city: string }) => c.city === "Desconhecida")
    expect(unknownCity).toBeDefined()
  })

  it("converts BigInt count to number in hourly data", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.hourly).toEqual([
      { hour: 9, count: 10 },
      { hour: 14, count: 20 },
    ])
    data.hourly.forEach((h: { count: unknown }) => {
      expect(typeof h.count).toBe("number")
    })
  })

  it("converts BigInt count to number in daily data", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.daily).toEqual([
      { day: "2026-03-01", count: 15 },
      { day: "2026-03-02", count: 25 },
    ])
    data.daily.forEach((d: { count: unknown }) => {
      expect(typeof d.count).toBe("number")
    })
  })

  it("defaults to 30 days when no days param provided", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.period).toBe(30)
  })

  it("uses the days param when provided", async () => {
    setupHappyPath()
    const res = await GET(makeRequest("days=7"))
    const data = await res.json()
    expect(data.period).toBe(7)
  })

  it("caps days at 90 even when a larger value is requested", async () => {
    setupHappyPath()
    const res = await GET(makeRequest("days=180"))
    const data = await res.json()
    expect(data.period).toBe(90)
  })

  it("caps days at 90 for an extreme value", async () => {
    setupHappyPath()
    const res = await GET(makeRequest("days=9999"))
    const data = await res.json()
    expect(data.period).toBe(90)
  })

  it("uses 30 days when days param is not a valid number", async () => {
    setupHappyPath()
    const res = await GET(makeRequest("days=abc"))
    const data = await res.json()
    expect(data.period).toBe(30)
  })

  it("passes profileId and since date to pageView.count query", async () => {
    setupHappyPath()
    await GET(makeRequest("days=7"))
    expect(prismaMock.pageView.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ profileId }),
      })
    )
  })

  it("returns countries data with correct shape", async () => {
    setupHappyPath()
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.countries).toContainEqual({ country: "BR", count: 90 })
  })
})
