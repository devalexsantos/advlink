// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    productEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/admin/events/route"

const adminSession = { id: "admin-1", role: "admin" }

const makeRequest = (params = "") =>
  new Request(`http://localhost/api/admin/events${params ? `?${params}` : ""}`)

describe("GET /api/admin/events", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.productEvent.findMany.mockResolvedValue([])
    prismaMock.productEvent.count.mockResolvedValue(0)
    prismaMock.productEvent.groupBy.mockResolvedValue([])
    prismaMock.user.findMany.mockResolvedValue([])
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns events with pagination metadata", async () => {
    const events = [
      { id: "e1", type: "login", userId: null, createdAt: new Date() },
      { id: "e2", type: "profile_updated", userId: null, createdAt: new Date() },
    ]
    prismaMock.productEvent.findMany.mockResolvedValue(events)
    prismaMock.productEvent.count.mockResolvedValue(2)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.events).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.page).toBe(1)
    expect(data.perPage).toBe(30)
  })

  it("passes type filter to prisma when type param is provided", async () => {
    const res = await GET(makeRequest("type=login"))
    expect(res.status).toBe(200)
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "login" } })
    )
    expect(prismaMock.productEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "login" } })
    )
  })

  it("passes userId filter to prisma when userId param is provided", async () => {
    const res = await GET(makeRequest("userId=user-42"))
    expect(res.status).toBe(200)
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } })
    )
  })

  it("passes both type and userId filters together", async () => {
    const res = await GET(makeRequest("type=checkout&userId=user-5"))
    expect(res.status).toBe(200)
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "checkout", userId: "user-5" } })
    )
  })

  it("applies correct skip for page 2", async () => {
    prismaMock.productEvent.count.mockResolvedValue(45)
    const res = await GET(makeRequest("page=2"))
    expect(res.status).toBe(200)
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 30 })
    )
    const data = await res.json()
    expect(data.page).toBe(2)
  })

  it("clamps page to minimum of 1 for invalid page param", async () => {
    const res = await GET(makeRequest("page=0"))
    expect(res.status).toBe(200)
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    )
    const data = await res.json()
    expect(data.page).toBe(1)
  })

  it("returns stats from groupBy result", async () => {
    prismaMock.productEvent.groupBy.mockResolvedValue([
      { type: "login", _count: { type: 10 } },
      { type: "profile_updated", _count: { type: 4 } },
    ])

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.stats).toEqual([
      { type: "login", count: 10 },
      { type: "profile_updated", count: 4 },
    ])
  })

  it("enriches events with user data from userMap", async () => {
    const events = [{ id: "e1", type: "login", userId: "u1", createdAt: new Date() }]
    prismaMock.productEvent.findMany.mockResolvedValue(events)
    prismaMock.productEvent.count.mockResolvedValue(1)
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u1", name: "Ana Silva", email: "ana@test.com" },
    ])

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.events[0].user).toEqual({
      id: "u1",
      name: "Ana Silva",
      email: "ana@test.com",
    })
  })

  it("sets user to null for events with no userId", async () => {
    const events = [{ id: "e2", type: "page_view", userId: null, createdAt: new Date() }]
    prismaMock.productEvent.findMany.mockResolvedValue(events)
    prismaMock.productEvent.count.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.events[0].user).toBeNull()
    // Should not attempt to fetch users when there are no userIds
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it("sets user to null when userId is present but not found in userMap", async () => {
    const events = [{ id: "e3", type: "login", userId: "unknown-user", createdAt: new Date() }]
    prismaMock.productEvent.findMany.mockResolvedValue(events)
    prismaMock.productEvent.count.mockResolvedValue(1)
    prismaMock.user.findMany.mockResolvedValue([]) // user not found

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.events[0].user).toBeNull()
  })

  it("fetches users only once even with duplicate userIds across events", async () => {
    const events = [
      { id: "e1", type: "login", userId: "u1", createdAt: new Date() },
      { id: "e2", type: "checkout", userId: "u1", createdAt: new Date() },
    ]
    prismaMock.productEvent.findMany.mockResolvedValue(events)
    prismaMock.productEvent.count.mockResolvedValue(2)
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "Carlos", email: "c@test.com" }])

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    // Deduplication via Set — should query with only ["u1"]
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["u1"] } } })
    )
  })

  it("orders events by createdAt descending", async () => {
    await GET(makeRequest())
    expect(prismaMock.productEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    )
  })
})
