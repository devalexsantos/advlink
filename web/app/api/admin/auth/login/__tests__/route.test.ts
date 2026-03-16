// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, bcryptMock } = vi.hoisted(() => ({
  prismaMock: { adminUser: { findUnique: vi.fn() } },
  bcryptMock: { compare: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("bcryptjs", () => ({ default: bcryptMock }))
vi.mock("@/lib/admin-auth", () => ({
  createAdminToken: vi.fn().mockResolvedValue("jwt-token-test"),
  ADMIN_COOKIE: "admin-token",
}))

import { POST } from "@/app/api/admin/auth/login/route"

describe("POST /api/admin/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 without email/password", async () => {
    const req = new Request("http://localhost/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 401 for non-existent admin", async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue(null)
    const req = new Request("http://localhost/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "pass" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 401 for inactive admin", async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: "a1", isActive: false })
    const req = new Request("http://localhost/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "pass" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 401 for wrong password", async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: "a1", email: "admin@test.com", isActive: true, passwordHash: "hash",
    })
    bcryptMock.compare.mockResolvedValue(false)
    const req = new Request("http://localhost/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "wrong" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns admin data and sets cookie on success", async () => {
    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: "a1", email: "admin@test.com", name: "Admin", role: "admin",
      isActive: true, passwordHash: "hash",
    })
    bcryptMock.compare.mockResolvedValue(true)
    const req = new Request("http://localhost/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "correct" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.email).toBe("admin@test.com")
    expect(res.headers.getSetCookie().some((c: string) => c.includes("admin-token"))).toBe(true)
  })
})
