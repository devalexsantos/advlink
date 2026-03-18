// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getAdminSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { count: vi.fn(), findMany: vi.fn() },
  },
  getAdminSessionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))

import { GET } from "@/app/api/admin/funnel/route"

describe("GET /api/admin/funnel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: 3 counts for funnel stages
    prismaMock.user.count
      .mockResolvedValueOnce(5)  // signup_only
      .mockResolvedValueOnce(3)  // site_created
      .mockResolvedValueOnce(2)  // published
    prismaMock.user.findMany.mockResolvedValue([])
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/admin/funnel?stage=signup_only")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns funnel counts", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const req = new Request("http://localhost/api/admin/funnel?stage=signup_only")
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.funnel).toEqual({
      signup_only: 5,
      site_created: 3,
      published: 2,
    })
  })

  it("returns users for signup_only stage", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const users = [{ id: "u1", name: "Test", email: "test@test.com" }]
    prismaMock.user.findMany.mockResolvedValue(users)

    const req = new Request("http://localhost/api/admin/funnel?stage=signup_only&page=1")
    const res = await GET(req)
    const data = await res.json()
    expect(data.users).toHaveLength(1)
    expect(data.total).toBe(5)
  })

  it("returns users for site_created stage", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    prismaMock.user.findMany.mockResolvedValue([])

    const req = new Request("http://localhost/api/admin/funnel?stage=site_created")
    const res = await GET(req)
    const data = await res.json()
    expect(data.total).toBe(3)
  })

  it("returns users for published stage", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    prismaMock.user.findMany.mockResolvedValue([])

    const req = new Request("http://localhost/api/admin/funnel?stage=published")
    const res = await GET(req)
    const data = await res.json()
    expect(data.total).toBe(2)
  })

  it("returns empty users when no stage specified", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const req = new Request("http://localhost/api/admin/funnel")
    const res = await GET(req)
    const data = await res.json()
    expect(data.users).toEqual([])
    expect(data.total).toBe(0)
  })
})
