// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, trackEventMock } = vi.hoisted(() => ({
  prismaMock: {
    ticket: { findMany: vi.fn(), create: vi.fn() },
    ticketMessage: { findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/ticket.png" }),
  trackEventMock: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("@/lib/emails/ticketEmails", () => ({
  sendTicketCreatedEmail: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from "@/app/api/tickets/route"

const session = { user: { id: "user-1" } }

describe("GET /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns user tickets", async () => {
    getServerSessionMock.mockResolvedValue(session)
    const tickets = [{ id: "t1", subject: "Help", _count: { messages: 1 } }]
    prismaMock.ticket.findMany.mockResolvedValue(tickets)
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
  })
})

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.ticket.create.mockResolvedValue({ id: "t1", number: 1, subject: "Help", category: "support" })
    prismaMock.user.findUnique.mockResolvedValue({ name: "User", email: "user@test.com" })
  })

  it("returns 401 without session", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("subject", "Help")
    form.append("message", "I need help")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 without subject/message", async () => {
    const form = new FormData()
    form.append("subject", "")
    form.append("message", "")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates ticket with message", async () => {
    const form = new FormData()
    form.append("subject", "Help me")
    form.append("message", "I have a problem")
    form.append("category", "bug")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prismaMock.ticket.create).toHaveBeenCalled()
  })
})
