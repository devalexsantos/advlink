import { describe, it, expect, vi, beforeEach } from "vitest"

const { sessionMock, prismaMock, uploadToS3Mock, sendTicketReplyEmailMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  prismaMock: {
    ticket: { findFirst: vi.fn(), update: vi.fn() },
    ticketMessage: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.example.com/img.png" }),
  sendTicketReplyEmailMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("next-auth", () => ({ getServerSession: sessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/emails/ticketEmails", () => ({ sendTicketReplyEmail: sendTicketReplyEmailMock }))

import { POST } from "@/app/api/tickets/[id]/messages/route"

function makeFormData(fields: Record<string, string>, files?: { name: string; content: string }[]) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  if (files) {
    for (const f of files) {
      fd.append("images", new File([f.content], f.name, { type: "image/png" }))
    }
  }
  return fd
}

describe("POST /api/tickets/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without session", async () => {
    sessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "hi" }) })
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(401)
  })

  it("returns 400 if no message and no images", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "" }) })
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(400)
  })

  it("returns 404 if ticket not found", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue(null)
    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "help" }) })
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(404)
  })

  it("creates message and returns 201", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t1", number: 1, subject: "Help", status: "open", assignedAdmin: null })
    prismaMock.ticketMessage.create.mockResolvedValue({ id: "m1", message: "help me", ticketId: "t1" })

    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "help me" }) })
    const res = await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(201)
    expect(prismaMock.ticketMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ticketId: "t1",
        senderType: "user",
        senderUserId: "u1",
        message: "help me",
      }),
    }))
  })

  it("reopens resolved ticket when user sends message", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t1", number: 1, subject: "Help", status: "resolved", assignedAdmin: null })
    prismaMock.ticketMessage.create.mockResolvedValue({ id: "m1" })

    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "still broken" }) })
    await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(prismaMock.ticket.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { status: "open" } })
  })

  it("reopens waiting_customer ticket", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t1", number: 1, subject: "Help", status: "waiting_customer", assignedAdmin: null })
    prismaMock.ticketMessage.create.mockResolvedValue({ id: "m1" })

    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "here's info" }) })
    await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(prismaMock.ticket.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { status: "open" } })
  })

  it("does not reopen open ticket", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t1", number: 1, subject: "Help", status: "open", assignedAdmin: null })
    prismaMock.ticketMessage.create.mockResolvedValue({ id: "m1" })

    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "msg" }) })
    await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(prismaMock.ticket.update).not.toHaveBeenCalled()
  })

  it("notifies assigned admin via email", async () => {
    sessionMock.mockResolvedValue({ user: { id: "u1" } })
    prismaMock.ticket.findFirst.mockResolvedValue({
      id: "t1", number: 5, subject: "Bug", status: "open",
      assignedAdmin: { email: "admin@test.com", name: "Admin" },
    })
    prismaMock.ticketMessage.create.mockResolvedValue({ id: "m1" })
    prismaMock.user.findUnique.mockResolvedValue({ name: "User Test", email: "user@test.com" })

    const req = new Request("http://localhost", { method: "POST", body: makeFormData({ message: "urgent" }) })
    await POST(req, { params: Promise.resolve({ id: "t1" }) })
    expect(sendTicketReplyEmailMock).toHaveBeenCalledWith(5, "Bug", "urgent", "admin@test.com", "User Test")
  })
})
