import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, bcryptMock, logAuditMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  bcryptMock: { hash: vi.fn() },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/audit-log", () => ({ logAudit: logAuditMock }))
vi.mock("bcryptjs", () => ({ default: bcryptMock }))

import { PATCH } from "@/app/api/admin/admins/[id]/route"

const superAdmin = { id: "super-1", role: "super_admin" }
const regularAdmin = { id: "admin-1", role: "admin" }

const existingAdminUser = {
  name: "Ana Admin",
  role: "admin",
  isActive: true,
}

const updatedAdminUser = {
  id: "target-1",
  email: "ana@advlink.com",
  name: "Ana Admin",
  role: "admin",
  isActive: true,
}

describe("PATCH /api/admin/admins/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.adminUser.findUnique.mockResolvedValue(existingAdminUser)
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 403 when caller is not super_admin", async () => {
    getAdminSessionMock.mockResolvedValue(regularAdmin)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe("Apenas super admins podem editar administradores")
  })

  it("returns 400 when password is too short (less than 6 characters)", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ password: "abc" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("A senha deve ter no mínimo 6 caracteres")
  })

  it("returns 400 when password is an empty string", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ password: "" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(400)
  })

  it("updates name and returns updated admin", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue({ ...updatedAdminUser, name: "Novo Nome" })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Novo Nome" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe("Novo Nome")
    expect(prismaMock.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "target-1" },
        data: expect.objectContaining({ name: "Novo Nome" }),
      })
    )
  })

  it("updates role", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue({ ...updatedAdminUser, role: "super_admin" })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ role: "super_admin" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(200)
    expect(prismaMock.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "super_admin" }),
      })
    )
  })

  it("updates isActive", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue({ ...updatedAdminUser, isActive: false })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })
    expect(res.status).toBe(200)
    expect(prismaMock.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    )
  })

  it("hashes password with bcrypt when password is valid", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    bcryptMock.hash.mockResolvedValue("hashed_secret_pw")
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ password: "newpassword" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(bcryptMock.hash).toHaveBeenCalledWith("newpassword", 10)
    expect(prismaMock.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed_secret_pw" }),
      })
    )
  })

  it("logs admin_password_changed audit when password is updated", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    bcryptMock.hash.mockResolvedValue("hashed_pw")
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ password: "securepass" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "super-1",
        action: "admin_password_changed",
        entityType: "AdminUser",
        entityId: "target-1",
      })
    )
  })

  it("logs admin_updated audit when name/role/isActive are updated", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue({ ...updatedAdminUser, name: "Renomeado" })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Renomeado" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "super-1",
        action: "admin_updated",
        entityType: "AdminUser",
        entityId: "target-1",
        before: existingAdminUser,
        after: expect.objectContaining({ name: "Renomeado" }),
      })
    )
  })

  it("logs both admin_password_changed and admin_updated when all fields are provided", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    bcryptMock.hash.mockResolvedValue("hashed_pw")
    prismaMock.adminUser.update.mockResolvedValue({ ...updatedAdminUser, name: "Updated", role: "super_admin" })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated", role: "super_admin", password: "securepass" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(logAuditMock).toHaveBeenCalledTimes(2)
    const calls = logAuditMock.mock.calls.map((c: unknown[]) => (c[0] as { action: string }).action)
    expect(calls).toContain("admin_password_changed")
    expect(calls).toContain("admin_updated")
  })

  it("does not log admin_updated when only password is changed", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    bcryptMock.hash.mockResolvedValue("hashed_pw")
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ password: "securepass" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin_password_changed" })
    )
  })

  it("does not log admin_password_changed when no password is provided", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Ana Admin" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin_updated" })
    )
    expect(bcryptMock.hash).not.toHaveBeenCalled()
  })

  it("reads existing admin state before update for audit before snapshot", async () => {
    getAdminSessionMock.mockResolvedValue(superAdmin)
    prismaMock.adminUser.update.mockResolvedValue(updatedAdminUser)

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "target-1" }) })

    expect(prismaMock.adminUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "target-1" },
        select: { name: true, role: true, isActive: true },
      })
    )
  })
})
