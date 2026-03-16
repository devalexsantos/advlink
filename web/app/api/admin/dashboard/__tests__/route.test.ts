// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getAdminSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { count: vi.fn(), findMany: vi.fn() },
    profile: { count: vi.fn(), findMany: vi.fn() },
    ticket: { count: vi.fn(), findMany: vi.fn() },
  },
  getAdminSessionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))

import { GET } from "@/app/api/admin/dashboard/route"
import { NextRequest } from "next/server"

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.count.mockResolvedValue(10)
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.profile.count.mockResolvedValue(5)
    prismaMock.profile.findMany.mockResolvedValue([])
    prismaMock.ticket.count.mockResolvedValue(2)
    prismaMock.ticket.findMany.mockResolvedValue([])
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/admin/dashboard")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns dashboard KPIs", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const req = new NextRequest("http://localhost/api/admin/dashboard")
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.totalUsers).toBe(10)
    expect(data.totalSites).toBe(5)
    expect(data.openTickets).toBe(2)
  })
})
