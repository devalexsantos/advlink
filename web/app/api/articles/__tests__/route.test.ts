// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    article: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { GET, POST } from "@/app/api/articles/route"

const postReq = (body: unknown) =>
  new Request("http://localhost/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  getActiveSiteIdMock.mockResolvedValue("p1")
  prismaMock.article.findMany.mockResolvedValue([])
  prismaMock.article.create.mockImplementation(({ data }) => Promise.resolve({ id: "a1", ...data }))
})

describe("GET /api/articles", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it("returns 404 without site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await GET()).status).toBe(404)
  })

  it("lists the active site's articles, newest updated first", async () => {
    prismaMock.article.findMany.mockResolvedValue([{ id: "a1", title: "T" }])
    const res = await GET()
    expect(await res.json()).toEqual({ articles: [{ id: "a1", title: "T" }] })
    expect(prismaMock.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: "p1" }, orderBy: { updatedAt: "desc" } }),
    )
  })
})

describe("POST /api/articles", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await POST(postReq({ title: "X" }))).status).toBe(401)
  })

  it.each([[{}], [{ title: "   " }], [{ title: "a".repeat(151) }]])("returns 400 for %j", async (body) => {
    expect((await POST(postReq(body))).status).toBe(400)
  })

  it("creates a draft with a slug from the title", async () => {
    const res = await POST(postReq({ title: "  Direito do Consumidor: o que é?  " }))
    expect(res.status).toBe(201)
    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: { profileId: "p1", title: "Direito do Consumidor: o que é?", slug: "direito-do-consumidor-o-que-e", content: "", status: "draft" },
    })
    expect((await res.json()).article.id).toBe("a1")
  })

  it("adds a numeric suffix when the slug is taken on the site", async () => {
    prismaMock.article.findMany.mockResolvedValue([{ slug: "guarda" }, { slug: "guarda-2" }])
    await POST(postReq({ title: "Guarda" }))
    expect(prismaMock.article.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ profileId: "p1" }) }))
    expect(prismaMock.article.create.mock.calls[0][0].data.slug).toBe("guarda-3")
  })

  it("retries once on a unique-constraint race", async () => {
    prismaMock.article.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }))
    const res = await POST(postReq({ title: "Guarda" }))
    expect(res.status).toBe(201)
    expect(prismaMock.article.create).toHaveBeenCalledTimes(2)
  })
})
