// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: { profile: { findFirst: vi.fn() } },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { POST } from "@/app/api/profile/validate-slug/route"

describe("POST /api/profile/validate-slug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getActiveSiteIdMock.mockResolvedValue("profile-1")
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

  it("returns 400 when slug has only special characters and normalizes to empty", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "!!!@@@###$$$" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.valid).toBe(false)
    expect(data.message).toBe("Slug inválido")
  })

  it("truncates slug to 60 characters", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const longSlug = "a".repeat(100)
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: longSlug }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.slug).toHaveLength(60)
    expect(data.slug).toBe("a".repeat(60))
  })

  it("excludes own profile via NOT clause when profileId exists", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    getActiveSiteIdMock.mockResolvedValue("my-profile-id")
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile/validate-slug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "my-slug" }),
    })
    await POST(req)
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith({
      where: { slug: "my-slug", NOT: { id: "my-profile-id" } },
      select: { id: true },
    })
  })
})
