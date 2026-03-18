// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/admin/audit/route"

const adminSession = { id: "admin-1", role: "admin" }

const makeRequest = (params = "") =>
  new Request(`http://localhost/api/admin/audit${params ? `?${params}` : ""}`)

describe("GET /api/admin/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.auditLog.findMany.mockResolvedValue([])
    prismaMock.auditLog.count.mockResolvedValue(0)
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns logs with pagination metadata", async () => {
    const logs = [
      {
        id: "log-1",
        action: "UPDATE_USER",
        entityType: "User",
        adminUserId: "admin-1",
        createdAt: new Date(),
        adminUser: { name: "Admin", email: "admin@test.com" },
      },
    ]
    prismaMock.auditLog.findMany.mockResolvedValue(logs)
    prismaMock.auditLog.count.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.logs).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
    expect(data.perPage).toBe(30)
  })

  it("filters by adminId when provided", async () => {
    const res = await GET(makeRequest("adminId=admin-99"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { adminUserId: "admin-99" } })
    )
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { adminUserId: "admin-99" } })
    )
  })

  it("filters by entityType when provided", async () => {
    const res = await GET(makeRequest("entityType=User"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityType: "User" } })
    )
  })

  it("filters by action using contains insensitive when provided", async () => {
    const res = await GET(makeRequest("action=update"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: { contains: "update", mode: "insensitive" } },
      })
    )
  })

  it("combines all filters when all params are provided", async () => {
    const res = await GET(makeRequest("adminId=admin-2&entityType=Profile&action=delete"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          adminUserId: "admin-2",
          entityType: "Profile",
          action: { contains: "delete", mode: "insensitive" },
        },
      })
    )
  })

  it("uses empty where when no filters are provided", async () => {
    await GET(makeRequest())
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it("applies correct skip for page 2", async () => {
    prismaMock.auditLog.count.mockResolvedValue(60)
    const res = await GET(makeRequest("page=2"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 30 })
    )
    const data = await res.json()
    expect(data.page).toBe(2)
  })

  it("clamps page to minimum of 1 for invalid page param", async () => {
    const res = await GET(makeRequest("page=-5"))
    expect(res.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    )
    const data = await res.json()
    expect(data.page).toBe(1)
  })

  it("includes adminUser relation in the query", async () => {
    await GET(makeRequest())
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { adminUser: { select: { name: true, email: true } } },
      })
    )
  })

  it("orders logs by createdAt descending", async () => {
    await GET(makeRequest())
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    )
  })

  it("returns empty logs array when no records exist", async () => {
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(data.logs).toEqual([])
    expect(data.total).toBe(0)
  })
})
