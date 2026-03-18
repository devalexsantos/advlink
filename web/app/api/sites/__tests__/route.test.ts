// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, setActiveSiteCookieMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findMany: vi.fn(), create: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  setActiveSiteCookieMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ setActiveSiteCookie: setActiveSiteCookieMock }))

import { GET, POST } from "@/app/api/sites/route"

const session = { user: { id: "user-1" } }

describe("GET /api/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns list of user sites", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const sites = [
      { id: "s1", name: "Site 1", slug: "site-1", isActive: true },
      { id: "s2", name: "Site 2", slug: "site-2", isActive: false },
    ]
    prismaMock.profile.findMany.mockResolvedValue(sites)

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sites).toHaveLength(2)
    expect(data.sites[0].name).toBe("Site 1")
  })

  it("returns empty array when user has no sites", async () => {
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.profile.findMany.mockResolvedValue([])

    const res = await GET()
    const data = await res.json()
    expect(data.sites).toEqual([])
  })
})

describe("POST /api/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New Site" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 for empty name", async () => {
    const req = new Request("http://localhost/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates site and sets cookie", async () => {
    prismaMock.profile.create.mockResolvedValue({ id: "new-site", name: "Escritório SP" })
    const req = new Request("http://localhost/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Escritório SP" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.site.name).toBe("Escritório SP")
    expect(prismaMock.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        name: "Escritório SP",
        setupComplete: false,
        isActive: false,
      }),
    })
    expect(setActiveSiteCookieMock).toHaveBeenCalledWith("new-site")
  })
})
