import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, sendTicketStatusChangedEmailMock } = vi.hoisted(() => ({
  getAdminSessionMock: vi.fn(),
  prismaMock: {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  sendTicketStatusChangedEmailMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/emails/ticketEmails", () => ({
  sendTicketStatusChangedEmail: sendTicketStatusChangedEmailMock,
}))

import { GET, PATCH } from "@/app/api/admin/tickets/[id]/route"

const adminSession = { id: "admin-1", role: "admin" }

describe("GET /api/admin/tickets/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "ticket-1" }),
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 404 when ticket does not exist", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Ticket não encontrado")
  })

  it("returns ticket with messages, user, and assignedAdmin", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const ticket = {
      id: "ticket-1",
      number: 42,
      subject: "Problema com assinatura",
      status: "open",
      priority: "high",
      category: "billing",
      user: { id: "user-1", name: "Dr. Silva", email: "silva@oab.com" },
      assignedAdmin: { id: "admin-1", name: "Admin", email: "admin@advlink.com" },
      messages: [
        {
          id: "msg-1",
          message: "Preciso de ajuda",
          senderType: "user",
          senderUser: { name: "Dr. Silva", email: "silva@oab.com" },
          senderAdmin: null,
          createdAt: new Date(),
        },
      ],
    }
    prismaMock.ticket.findUnique.mockResolvedValue(ticket)
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "ticket-1" }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe("ticket-1")
    expect(json.number).toBe(42)
    expect(json.user.name).toBe("Dr. Silva")
    expect(json.assignedAdmin.name).toBe("Admin")
    expect(json.messages).toHaveLength(1)
    expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ticket-1" } })
    )
  })
})

describe("PATCH /api/admin/tickets/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(401)
  })

  it("updates ticket status", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 42,
      subject: "Problema com assinatura",
      status: "closed",
      user: { email: "silva@oab.com", name: "Dr. Silva" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe("closed")
    expect(prismaMock.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1" },
        data: expect.objectContaining({ status: "closed" }),
      })
    )
  })

  it("sends status change email when status is updated and user has email", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 42,
      subject: "Problema com assinatura",
      status: "resolved",
      user: { email: "silva@oab.com", name: "Dr. Silva" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })

    // Give the fire-and-forget promise a tick to resolve
    await Promise.resolve()
    expect(sendTicketStatusChangedEmailMock).toHaveBeenCalledWith(
      42,
      "Problema com assinatura",
      "silva@oab.com",
      "resolved"
    )
  })

  it("does not send email when status is not in the update body", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 42,
      subject: "Problema",
      status: "open",
      user: { email: "silva@oab.com", name: "Dr. Silva" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ priority: "low" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })

    await Promise.resolve()
    expect(sendTicketStatusChangedEmailMock).not.toHaveBeenCalled()
  })

  it("updates priority", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 1,
      subject: "Test",
      status: "open",
      priority: "low",
      user: { email: null, name: "User" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ priority: "low" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(200)
    expect(prismaMock.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: "low" }) })
    )
  })

  it("updates category", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 1,
      subject: "Test",
      status: "open",
      category: "billing",
      user: { email: null, name: "User" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ category: "billing" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(200)
    expect(prismaMock.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: "billing" }) })
    )
  })

  it("assigns admin by setting assignedAdminId", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 1,
      subject: "Test",
      status: "open",
      assignedAdminId: "admin-2",
      user: { email: null, name: "User" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ assignedAdminId: "admin-2" }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(200)
    expect(prismaMock.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignedAdminId: "admin-2" }) })
    )
  })

  it("sets assignedAdminId to null when passed as empty string", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.update.mockResolvedValue({
      id: "ticket-1",
      number: 1,
      subject: "Test",
      status: "open",
      assignedAdminId: null,
      user: { email: null, name: "User" },
    })

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ assignedAdminId: "" }),
    })
    await PATCH(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(prismaMock.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignedAdminId: null }) })
    )
  })
})
