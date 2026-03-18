// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, setActiveSiteCookieMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { findFirst: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  setActiveSiteCookieMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ setActiveSiteCookie: setActiveSiteCookieMock }))

import { POST } from "@/app/api/sites/switch/route"

const session = { user: { id: "user-1" } }

describe("POST /api/sites/switch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost/api/sites/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId: "s1" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing siteId", async () => {
    const req = new Request("http://localhost/api/sites/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 for site not owned by user", async () => {
    prismaMock.profile.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost/api/sites/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId: "other-user-site" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("switches site and sets cookie", async () => {
    prismaMock.profile.findFirst.mockResolvedValue({ id: "site-2" })
    const req = new Request("http://localhost/api/sites/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId: "site-2" }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith({
      where: { id: "site-2", userId: "user-1" },
      select: { id: true },
    })
    expect(setActiveSiteCookieMock).toHaveBeenCalledWith("site-2")
  })
})
