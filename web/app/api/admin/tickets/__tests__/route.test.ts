import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    ticket: { findMany: vi.fn(), count: vi.fn() },
  },
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/admin/tickets/route"

describe("GET /api/admin/tickets", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/admin/tickets"))
    expect(res.status).toBe(401)
  })

  it("returns paginated tickets", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.ticket.findMany.mockResolvedValue([{ id: "t1", subject: "Help" }])
    prismaMock.ticket.count.mockResolvedValue(1)

    const res = await GET(new Request("http://localhost/api/admin/tickets"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tickets).toHaveLength(1)
    expect(json.total).toBe(1)
  })

  it("filters by status", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.ticket.findMany.mockResolvedValue([])
    prismaMock.ticket.count.mockResolvedValue(0)

    await GET(new Request("http://localhost/api/admin/tickets?status=open"))
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "open" }) })
    )
  })

  it("filters by priority and category", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.ticket.findMany.mockResolvedValue([])
    prismaMock.ticket.count.mockResolvedValue(0)

    await GET(new Request("http://localhost/api/admin/tickets?priority=high&category=bug"))
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ priority: "high", category: "bug" }),
      })
    )
  })

  it("supports pagination", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.ticket.findMany.mockResolvedValue([])
    prismaMock.ticket.count.mockResolvedValue(100)

    const res = await GET(new Request("http://localhost/api/admin/tickets?page=2"))
    const json = await res.json()
    expect(json.page).toBe(2)
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    )
  })
})
