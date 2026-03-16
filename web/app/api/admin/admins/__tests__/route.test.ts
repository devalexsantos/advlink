import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, bcryptMock, logAuditMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    adminUser: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
  bcryptMock: { hash: vi.fn() },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/audit-log", () => ({ logAudit: logAuditMock }))
vi.mock("bcryptjs", () => ({ default: bcryptMock }))

import { GET, POST } from "@/app/api/admin/admins/route"

describe("GET /api/admin/admins", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns list of admins", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const admins = [{ id: "a1", email: "a@b.com", name: "Admin", role: "admin", isActive: true }]
    prismaMock.adminUser.findMany.mockResolvedValue(admins)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })
})

describe("POST /api/admin/admins", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "123" }) })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 if not super_admin", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "admin" })
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "123" }) })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 if email or password missing", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "super_admin" })
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "a@b.com" }) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 409 if email already exists", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "super_admin" })
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: "existing" })
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ email: "a@b.com", password: "123" }) })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it("creates admin with hashed password and logs audit", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1", role: "super_admin" })
    prismaMock.adminUser.findUnique.mockResolvedValue(null)
    bcryptMock.hash.mockResolvedValue("hashed123")
    prismaMock.adminUser.create.mockResolvedValue({ id: "a2", email: "new@b.com", name: "New", role: "admin" })

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: "new@b.com", name: "New", password: "secret", role: "admin" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(bcryptMock.hash).toHaveBeenCalledWith("secret", 10)
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      adminUserId: "a1",
      action: "admin_created",
      entityType: "AdminUser",
    }))
  })
})
