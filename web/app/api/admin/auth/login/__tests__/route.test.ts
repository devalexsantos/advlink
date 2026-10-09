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
import { resetRateLimiters } from "@/lib/rate-limit"

function loginReq(email: string, password: string, ip = "1.2.3.4") {
  return new Request("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify({ email, password }),
  })
}

describe("POST /api/admin/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimiters()
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

  describe("rate limiting", () => {
    beforeEach(() => {
      prismaMock.adminUser.findUnique.mockResolvedValue({
        id: "a1", email: "admin@test.com", name: "Admin", role: "admin", isActive: true, passwordHash: "hash",
      })
      bcryptMock.compare.mockResolvedValue(false)
    })

    it("returns 429 with Retry-After after 5 attempts for the same IP+email, without checking the password", async () => {
      for (let i = 0; i < 5; i++) {
        expect((await POST(loginReq("admin@test.com", "wrong"))).status).toBe(401)
      }
      bcryptMock.compare.mockClear()
      const res = await POST(loginReq("Admin@Test.com ", "wrong"))
      expect(res.status).toBe(429)
      expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
      expect((await res.json()).error).toMatch(/Muitas tentativas/)
      expect(bcryptMock.compare).not.toHaveBeenCalled()
    })

    it("does not block another IP for the same email", async () => {
      for (let i = 0; i < 6; i++) await POST(loginReq("admin@test.com", "wrong", "1.1.1.1"))
      expect((await POST(loginReq("admin@test.com", "wrong", "2.2.2.2"))).status).toBe(401)
    })

    it("blocks an IP spraying many emails after 20 attempts", async () => {
      prismaMock.adminUser.findUnique.mockResolvedValue(null)
      for (let i = 0; i < 20; i++) {
        expect((await POST(loginReq(`user${i}@test.com`, "x"))).status).toBe(401)
      }
      expect((await POST(loginReq("other@test.com", "x"))).status).toBe(429)
    })

    it("resets the IP+email counter after a successful login", async () => {
      for (let i = 0; i < 4; i++) await POST(loginReq("admin@test.com", "wrong"))
      bcryptMock.compare.mockResolvedValue(true)
      expect((await POST(loginReq("admin@test.com", "right"))).status).toBe(200)
      bcryptMock.compare.mockResolvedValue(false)
      for (let i = 0; i < 5; i++) {
        expect((await POST(loginReq("admin@test.com", "wrong"))).status).toBe(401)
      }
    })
  })
})
