import { describe, it, expect, vi, beforeEach } from "vitest"

const { sessionMock, prismaMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  prismaMock: {
    ticket: { findFirst: vi.fn() },
  },
}))

vi.mock("next-auth", () => ({ getServerSession: sessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET } from "@/app/api/tickets/[id]/route"

describe("GET /api/tickets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    sessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 404 if ticket not found or not owned by user", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(404)
  })

  it("returns ticket with messages", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    const ticketData = {
      id: "t1",
      subject: "Help",
      messages: [{ id: "m1", message: "Hello", senderUser: { name: "User" }, senderAdmin: null }],
    }
    prismaMock.ticket.findFirst.mockResolvedValue(ticketData)
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe("t1")
    expect(json.messages).toHaveLength(1)
  })

  it("queries with correct userId and ticket id", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u99" } })
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t5", messages: [] })
    await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "t5" }) })
    expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t5", userId: "u99" },
      })
    )
  })
})
