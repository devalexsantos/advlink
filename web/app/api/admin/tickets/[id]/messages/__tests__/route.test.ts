// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { getAdminSessionMock, prismaMock, uploadToS3Mock, sendTicketReplyEmailMock } = vi.hoisted(
  () => ({
    getAdminSessionMock: vi.fn(),
    prismaMock: {
      ticket: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      ticketMessage: {
        create: vi.fn(),
      },
    },
    uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/tickets/image.png" }),
    sendTicketReplyEmailMock: vi.fn().mockResolvedValue(undefined),
  })
)

vi.mock("@/lib/admin-auth", () => ({ getAdminSession: getAdminSessionMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/emails/ticketEmails", () => ({
  sendTicketReplyEmail: sendTicketReplyEmailMock,
}))

import { POST } from "@/app/api/admin/tickets/[id]/messages/route"

const adminSession = { id: "admin-1", name: "Admin User", email: "admin@advlink.com", role: "admin" }
const openTicket = {
  id: "ticket-1",
  number: 42,
  subject: "Problema com assinatura",
  status: "open",
  user: { email: "silva@oab.com", name: "Dr. Silva" },
}

describe("POST /api/admin/tickets/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.ticket.update.mockResolvedValue({ ...openTicket, status: "in_progress" })
    prismaMock.ticketMessage.create.mockResolvedValue({
      id: "msg-1",
      ticketId: "ticket-1",
      message: "Estamos analisando",
      senderType: "admin",
      senderAdminId: "admin-1",
      imageUrls: [],
    })
  })

  it("returns 401 without admin session", async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("message", "Olá")
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Não autorizado")
  })

  it("returns 400 when neither message nor images are provided", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const form = new FormData()
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Mensagem ou imagem é obrigatória")
  })

  it("returns 400 when message is whitespace only and no images", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    const form = new FormData()
    form.append("message", "   ")
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })
    expect(res.status).toBe(400)
  })

  it("returns 404 when ticket does not exist", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(null)
    const form = new FormData()
    form.append("message", "Olá")
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Ticket não encontrado")
  })

  it("creates message with text and returns 201", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)

    const form = new FormData()
    form.append("message", "Estamos analisando o seu caso")
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    expect(res.status).toBe(201)
    expect(prismaMock.ticketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: "ticket-1",
          senderType: "admin",
          senderAdminId: "admin-1",
          message: "Estamos analisando o seu caso",
        }),
      })
    )
  })

  it("uploads each image file to S3 and stores URLs", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)
    uploadToS3Mock
      .mockResolvedValueOnce({ url: "https://s3.test/tickets/img1.png" })
      .mockResolvedValueOnce({ url: "https://s3.test/tickets/img2.jpg" })
    prismaMock.ticketMessage.create.mockResolvedValue({
      id: "msg-1",
      ticketId: "ticket-1",
      message: "",
      senderType: "admin",
      senderAdminId: "admin-1",
      imageUrls: ["https://s3.test/tickets/img1.png", "https://s3.test/tickets/img2.jpg"],
    })

    const form = new FormData()
    form.append("images", new File(["content1"], "photo1.png", { type: "image/png" }))
    form.append("images", new File(["content2"], "photo2.jpg", { type: "image/jpeg" }))
    const req = new Request("http://localhost", { method: "POST", body: form })
    const res = await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    expect(res.status).toBe(201)
    expect(uploadToS3Mock).toHaveBeenCalledTimes(2)
    expect(uploadToS3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/png",
        cacheControl: "public, max-age=31536000, immutable",
      })
    )
  })

  it("transitions ticket status from open to in_progress", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)

    const form = new FormData()
    form.append("message", "Vamos verificar")
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { status: "in_progress", assignedAdminId: "admin-1" },
    })
  })

  it("does not update ticket status when it is already in_progress", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue({ ...openTicket, status: "in_progress" })

    const form = new FormData()
    form.append("message", "Continuando análise")
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    expect(prismaMock.ticket.update).not.toHaveBeenCalled()
  })

  it("sends reply email to user when user has email", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)

    const form = new FormData()
    form.append("message", "Resposta do admin")
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    // Give the fire-and-forget promise a tick to resolve
    await Promise.resolve()
    expect(sendTicketReplyEmailMock).toHaveBeenCalledWith(
      42,
      "Problema com assinatura",
      "Resposta do admin",
      "silva@oab.com",
      "Admin User"
    )
  })

  it("uses admin email as sender name when name is null", async () => {
    const adminWithoutName = { ...adminSession, name: null }
    getAdminSessionMock.mockResolvedValue(adminWithoutName)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)

    const form = new FormData()
    form.append("message", "Resposta")
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    await Promise.resolve()
    expect(sendTicketReplyEmailMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "silva@oab.com",
      "admin@advlink.com"
    )
  })

  it("uses (imagem anexada) as message text in email when no text is provided", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket)
    prismaMock.ticketMessage.create.mockResolvedValue({
      id: "msg-1",
      ticketId: "ticket-1",
      message: "",
      senderType: "admin",
      senderAdminId: "admin-1",
      imageUrls: ["https://s3.test/image.png"],
    })

    const form = new FormData()
    form.append("images", new File(["img"], "photo.png", { type: "image/png" }))
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    await Promise.resolve()
    expect(sendTicketReplyEmailMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "(imagem anexada)",
      expect.anything(),
      expect.anything()
    )
  })

  it("does not send email when user has no email address", async () => {
    getAdminSessionMock.mockResolvedValue(adminSession)
    prismaMock.ticket.findUnique.mockResolvedValue({
      ...openTicket,
      user: { email: null, name: "Dr. Silva" },
    })

    const form = new FormData()
    form.append("message", "Resposta")
    const req = new Request("http://localhost", { method: "POST", body: form })
    await POST(req, { params: Promise.resolve({ id: "ticket-1" }) })

    await Promise.resolve()
    expect(sendTicketReplyEmailMock).not.toHaveBeenCalled()
  })
})
