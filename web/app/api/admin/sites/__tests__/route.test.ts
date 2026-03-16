import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    profile: { findMany: vi.fn(), count: vi.fn() },
  },
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/admin/sites/route"

describe("GET /api/admin/sites", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/admin/sites"))
    expect(res.status).toBe(401)
  })

  it("returns paginated sites", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.profile.findMany.mockResolvedValue([{ id: "p1", slug: "test" }])
    prismaMock.profile.count.mockResolvedValue(1)

    const res = await GET(new Request("http://localhost/api/admin/sites"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sites).toHaveLength(1)
    expect(json.total).toBe(1)
    expect(json.page).toBe(1)
  })

  it("supports search filter", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.profile.findMany.mockResolvedValue([])
    prismaMock.profile.count.mockResolvedValue(0)

    await GET(new Request("http://localhost/api/admin/sites?search=lawyer"))
    expect(prismaMock.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ slug: { contains: "lawyer", mode: "insensitive" } }),
          ]),
        }),
      })
    )
  })

  it("supports pagination", async () => {
    getAdminSessionMock.mockResolvedValue({ id: "a1" })
    prismaMock.profile.findMany.mockResolvedValue([])
    prismaMock.profile.count.mockResolvedValue(50)

    const res = await GET(new Request("http://localhost/api/admin/sites?page=3"))
    const json = await res.json()
    expect(json.page).toBe(3)
    expect(prismaMock.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 })
    )
  })
})
