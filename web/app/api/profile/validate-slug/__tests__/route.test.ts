// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock } = vi.hoisted(() => ({
  prismaMock: { profile: { findFirst: vi.fn() } },
  getServerSessionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))

import { POST } from "@/app/api/profile/validate-slug/route"

describe("POST /api/profile/validate-slug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "test" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns invalid for reserved slug", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "admin" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.error).toBe("reserved")
  })

  it("returns invalid for taken slug", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.profile.findFirst.mockResolvedValue({ id: "other" })
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "taken-slug" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.valid).toBe(false)
  })

  it("returns valid for available slug", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "my-profile" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.valid).toBe(true)
    expect(data.slug).toBe("my-profile")
  })

  it("normalizes slug", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "João Silva" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.slug).toBe("joao-silva")
  })
})
