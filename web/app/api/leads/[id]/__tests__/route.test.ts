// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, getActiveSiteIdMock } = vi.hoisted(() => ({
  prismaMock: {
    lead: { findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  getActiveSiteIdMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: getActiveSiteIdMock }))

import { DELETE, PATCH } from "@/app/api/leads/[id]/route"

const ctx = (id = "l1") => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) =>
  new Request("http://localhost/api/leads/l1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
const deleteReq = () => new Request("http://localhost/api/leads/l1", { method: "DELETE" })

beforeEach(() => {
  vi.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  getActiveSiteIdMock.mockResolvedValue("p1")
  prismaMock.lead.findFirst.mockResolvedValue({ id: "l1", readAt: null })
  prismaMock.lead.update.mockImplementation(({ data }) => Promise.resolve({ id: "l1", readAt: data.readAt }))
  prismaMock.lead.deleteMany.mockResolvedValue({ count: 1 })
})

describe("PATCH /api/leads/[id]", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await PATCH(patchReq({ read: true }), ctx())).status).toBe(401)
  })

  it("returns 404 without site", async () => {
    getActiveSiteIdMock.mockResolvedValue(null)
    expect((await PATCH(patchReq({ read: true }), ctx())).status).toBe(404)
  })

  it("returns 400 for an invalid body", async () => {
    expect((await PATCH(patchReq({ read: "yes" }), ctx())).status).toBe(400)
  })

  it("returns 404 for a lead of another site", async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null)
    const res = await PATCH(patchReq({ read: true }), ctx("other"))
    expect(res.status).toBe(404)
    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other", profileId: "p1" } }))
    expect(prismaMock.lead.update).not.toHaveBeenCalled()
  })

  it("marks as read", async () => {
    const res = await PATCH(patchReq({ read: true }), ctx())
    expect(res.status).toBe(200)
    expect(prismaMock.lead.update.mock.calls[0][0].data.readAt).toBeInstanceOf(Date)
  })

  it("keeps the first read timestamp", async () => {
    const first = new Date("2026-10-01T10:00:00Z")
    prismaMock.lead.findFirst.mockResolvedValue({ id: "l1", readAt: first })
    await PATCH(patchReq({ read: true }), ctx())
    expect(prismaMock.lead.update.mock.calls[0][0].data.readAt).toBe(first)
  })

  it("marks as unread", async () => {
    await PATCH(patchReq({ read: false }), ctx())
    expect(prismaMock.lead.update.mock.calls[0][0].data.readAt).toBeNull()
  })
})

describe("DELETE /api/leads/[id]", () => {
  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await DELETE(deleteReq(), ctx())).status).toBe(401)
  })

  it("deletes scoped to the active site", async () => {
    const res = await DELETE(deleteReq(), ctx())
    expect(res.status).toBe(200)
    expect(prismaMock.lead.deleteMany).toHaveBeenCalledWith({ where: { id: "l1", profileId: "p1" } })
  })

  it("returns 404 for a lead of another site", async () => {
    prismaMock.lead.deleteMany.mockResolvedValue({ count: 0 })
    expect((await DELETE(deleteReq(), ctx("other"))).status).toBe(404)
  })
})
