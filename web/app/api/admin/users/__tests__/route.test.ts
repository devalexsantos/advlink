// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getAdminSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn(), count: vi.fn() },
  },
  getAdminSessionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))

import { GET } from "@/app/api/admin/users/route"

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns paginated users", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    const users = [{ id: "u1", name: "User", email: "u@test.com" }]
    prismaMock.user.findMany.mockResolvedValue(users)
    prismaMock.user.count.mockResolvedValue(1)
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.users).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
  })

  it("returns paidSites from the billing status of each site, without Stripe ids", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        profiles: [
          { id: "p1", billingStatus: "ACTIVE" },
          { id: "p2", billingStatus: "GRACE" },
          { id: "p3", billingStatus: "SUSPENDED" },
          { id: "p4", billingStatus: "NONE" },
        ],
      },
      { id: "u2", profiles: [] },
    ])
    prismaMock.user.count.mockResolvedValue(2)

    const data = await (await GET(new Request("http://localhost/api/admin/users"))).json()

    expect(data.users[0].paidSites).toBe(2)
    expect(data.users[1].paidSites).toBe(0)
    const select = prismaMock.user.findMany.mock.calls[0][0].select
    expect(select.profiles.select.billingStatus).toBe(true)
  })

  it("supports search filter", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.user.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/admin/users?search=test")
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    )
  })

  it("supports status filter", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.user.count.mockResolvedValue(0)
    const req = new Request("http://localhost/api/admin/users?status=active")
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    )
  })
})
