// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCookies, prismaMock } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  prismaMock: { adminUser: { findUnique: vi.fn() } },
}))

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

import { createAdminToken, verifyAdminToken, getAdminSession, type AdminPayload } from "@/lib/admin-auth"

describe("admin-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createAdminToken()", () => {
    it("returns a valid JWT string", async () => {
      const payload: AdminPayload = { adminId: "a1", email: "admin@test.com", role: "admin" }
      const token = await createAdminToken(payload)
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })
  })

  describe("verifyAdminToken()", () => {
    it("decodes a valid token", async () => {
      const payload: AdminPayload = { adminId: "a1", email: "admin@test.com", role: "admin" }
      const token = await createAdminToken(payload)
      const result = await verifyAdminToken(token)
      expect(result).not.toBeNull()
      expect(result!.adminId).toBe("a1")
      expect(result!.email).toBe("admin@test.com")
      expect(result!.role).toBe("admin")
    })

    it("returns null for invalid token", async () => {
      const result = await verifyAdminToken("invalid.token.here")
      expect(result).toBeNull()
    })
  })

  describe("createAdminToken → verifyAdminToken roundtrip", () => {
    it("preserves payload data", async () => {
      const payload: AdminPayload = { adminId: "x1", email: "x@test.com", role: "super_admin" }
      const token = await createAdminToken(payload)
      const result = await verifyAdminToken(token)
      expect(result).toMatchObject(payload)
    })
  })

  describe("getAdminSession()", () => {
    it("returns null when no cookie", async () => {
      mockCookies.mockReturnValue({ get: () => undefined })
      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("returns null for invalid token", async () => {
      mockCookies.mockReturnValue({ get: () => ({ value: "bad-token" }) })
      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("returns null for inactive admin", async () => {
      const payload: AdminPayload = { adminId: "a1", email: "a@test.com", role: "admin" }
      const token = await createAdminToken(payload)
      mockCookies.mockReturnValue({ get: () => ({ value: token }) })
      prismaMock.adminUser.findUnique.mockResolvedValue({
        id: "a1", email: "a@test.com", name: "Admin", role: "admin", isActive: false,
      })
      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("returns admin data for valid session", async () => {
      const payload: AdminPayload = { adminId: "a1", email: "a@test.com", role: "admin" }
      const token = await createAdminToken(payload)
      mockCookies.mockReturnValue({ get: () => ({ value: token }) })
      const admin = { id: "a1", email: "a@test.com", name: "Admin", role: "admin", isActive: true }
      prismaMock.adminUser.findUnique.mockResolvedValue(admin)
      const result = await getAdminSession()
      expect(result).toEqual(admin)
    })
  })
})
