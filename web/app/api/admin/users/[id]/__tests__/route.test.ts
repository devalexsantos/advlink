import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, logAuditMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/audit-log", () => ({ logAudit: logAuditMock }))

import { GET, PATCH } from "@/app/api/admin/users/[id]/route"

const adminSession = { id: "admin-1", role: "admin" }

describe("GET /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "user-1" }),
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 404 when user does not exist", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Usuário não encontrado")
  })

  it("returns user with profiles, tickets, and nested data", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const user = {
      id: "user-1",
      name: "Dr. Costa",
      email: "costa@oab.com",
      isActive: true,
      profiles: [
        {
          id: "profile-1",
          slug: "dr-costa",
          activityAreas: [{ id: "area-1", name: "Trabalhista", position: 0 }],
          links: [],
          address: null,
        },
      ],
      tickets: [{ id: "t1", subject: "Ajuda", updatedAt: new Date() }],
    }
    prismaMock.user.findUnique.mockResolvedValue(user)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "user-1" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe("user-1")
    expect(json.name).toBe("Dr. Costa")
    expect(json.profiles).toHaveLength(1)
    expect(json.tickets).toHaveLength(1)
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    )
  })
})

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "user-1" }) })
    expect(res.status).toBe(401)
  })

  it("deactivates a user and logs user_deactivated audit action", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      name: "Dr. Costa",
      email: "costa@oab.com",
      isActive: false,
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "user-1" }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isActive).toBe(false)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin-1",
        action: "user_deactivated",
        entityType: "User",
        entityId: "user-1",
        before: { isActive: true },
        after: { isActive: false },
      })
    )
  })

  it("activates a user and logs user_activated audit action", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue({ isActive: false })
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      name: "Dr. Costa",
      email: "costa@oab.com",
      isActive: true,
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "user-1" }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isActive).toBe(true)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin-1",
        action: "user_activated",
        entityType: "User",
        entityId: "user-1",
        before: { isActive: false },
        after: { isActive: true },
      })
    )
  })

  it("calls user.update with the correct isActive value", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.user.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.user.update.mockResolvedValue({
      id: "user-1",
      name: "Dr. Costa",
      email: "costa@oab.com",
      isActive: false,
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "user-1" }) })

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { isActive: false },
      })
    )
  })
})
