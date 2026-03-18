import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, logAuditMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/audit-log", () => ({ logAudit: logAuditMock }))

import { GET, PATCH } from "@/app/api/admin/sites/[id]/route"

const adminSession = { id: "admin-1", role: "admin" }

describe("GET /api/admin/sites/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "site-1" }),
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 404 when site does not exist", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.profile.findUnique.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Site não encontrado")
  })

  it("returns site with user data", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const site = {
      id: "site-1",
      slug: "dr-silva",
      isActive: true,
      user: {
        id: "user-1",
        name: "Dr. Silva",
        email: "silva@oab.com",
        isActive: true,
        stripeCustomerId: "cus_123",
      },
    }
    prismaMock.profile.findUnique.mockResolvedValue(site)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "site-1" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe("site-1")
    expect(json.user.name).toBe("Dr. Silva")
    expect(json.user.email).toBe("silva@oab.com")
    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "site-1" } })
    )
  })
})

describe("PATCH /api/admin/sites/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "site-1" }) })
    expect(res.status).toBe(401)
  })

  it("suspends a site and logs site_suspended audit action", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.profile.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.profile.update.mockResolvedValue({ id: "site-1", isActive: false })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "site-1" }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isActive).toBe(false)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin-1",
        action: "site_suspended",
        entityType: "Profile",
        entityId: "site-1",
        before: { isActive: true },
        after: { isActive: false },
      })
    )
  })

  it("reactivates a site and logs site_reactivated audit action", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.profile.findUnique.mockResolvedValue({ isActive: false })
    prismaMock.profile.update.mockResolvedValue({ id: "site-1", isActive: true })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "site-1" }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isActive).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin-1",
        action: "site_reactivated",
        entityType: "Profile",
        entityId: "site-1",
        before: { isActive: false },
        after: { isActive: true },
      })
    )
  })

  it("calls profile.update with the correct isActive value", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.profile.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.profile.update.mockResolvedValue({ id: "site-1", isActive: false })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "site-1" }) })

    expect(prismaMock.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "site-1" },
        data: { isActive: false },
      })
    )
  })
})
