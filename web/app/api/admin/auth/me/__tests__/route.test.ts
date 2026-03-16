import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))

import { GET } from "@/app/api/admin/auth/me/route"

describe("GET /api/admin/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if no admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns admin data on valid session", async () => {
    const admin = { id: "a1", email: "admin@test.com", name: "Admin", role: "admin", isActive: true }
    getAdminSessionMock.mockResolvedValue(admin)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.email).toBe("admin@test.com")
  })
})
