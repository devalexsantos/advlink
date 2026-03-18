// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, getServerSessionMock, uploadToS3Mock, trackEventMock, sendTicketCreatedEmailMock } = vi.hoisted(
  () => ({
    prismaMock: {
      ticket: { findMany: vi.fn(), create: vi.fn() },
      ticketMessage: { findFirst: vi.fn(), update: vi.fn() },
      user: { findUnique: vi.fn() },
    },
    getServerSessionMock: vi.fn(),
    uploadToS3Mock: vi.fn().mockResolvedValue({ url: "https://s3.test/ticket-img.png" }),
    trackEventMock: vi.fn().mockResolvedValue({}),
    sendTicketCreatedEmailMock: vi.fn().mockResolvedValue(undefined),
  })
)

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/s3", () => ({ uploadToS3: uploadToS3Mock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("@/lib/emails/ticketEmails", () => ({
  sendTicketCreatedEmail: sendTicketCreatedEmailMock,
}))

import { GET, POST } from "@/app/api/tickets/route"

const session = { user: { id: "user-1" } }

const ticketFixture = {
  id: "ticket-1",
  number: 1,
  userId: "user-1",
  subject: "Problema com acesso",
  category: "support",
  status: "open",
  priority: "medium",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  _count: { messages: 3 },
}

describe("GET /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.ticket.findMany.mockResolvedValue([ticketFixture])
  })

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns list of tickets for the authenticated user", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("ticket-1")
    expect(data[0].subject).toBe("Problema com acesso")
  })

  it("queries tickets filtered by userId, ordered by updatedAt desc", async () => {
    await GET()
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
      })
    )
  })

  it("includes message count in the ticket query", async () => {
    await GET()
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { messages: true } } },
      })
    )
  })

  it("returns empty array when user has no tickets", async () => {
    prismaMock.ticket.findMany.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(0)
  })
})

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue(session)
    prismaMock.ticket.create.mockResolvedValue(ticketFixture)
    prismaMock.ticketMessage.findFirst.mockResolvedValue({ id: "msg-1", ticketId: "ticket-1" })
    prismaMock.ticketMessage.update.mockResolvedValue({})
    prismaMock.user.findUnique.mockResolvedValue({ name: "João", email: "joao@test.com" })
  })

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const form = new FormData()
    form.append("subject", "Test")
    form.append("message", "Hello")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe("Não autorizado")
  })

  it("returns 400 when subject is missing", async () => {
    const form = new FormData()
    form.append("subject", "")
    form.append("message", "Hello")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Assunto e mensagem são obrigatórios")
  })

  it("returns 400 when message is missing", async () => {
    const form = new FormData()
    form.append("subject", "Preciso de ajuda")
    form.append("message", "")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Assunto e mensagem são obrigatórios")
  })

  it("returns 400 when both subject and message are missing", async () => {
    const form = new FormData()
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates ticket with 201 status on valid request", async () => {
    const form = new FormData()
    form.append("subject", "Problema com acesso")
    form.append("message", "Não consigo acessar minha conta")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe("ticket-1")
    expect(data.subject).toBe("Problema com acesso")
  })

  it("creates ticket with correct data including userId and message", async () => {
    const form = new FormData()
    form.append("subject", "Preciso de ajuda")
    form.append("message", "Minha área não aparece")
    form.append("category", "billing")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(prismaMock.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          subject: "Preciso de ajuda",
          category: "billing",
          messages: expect.objectContaining({
            create: expect.objectContaining({
              senderType: "user",
              senderUserId: "user-1",
              message: "Minha área não aparece",
            }),
          }),
        }),
      })
    )
  })

  it("defaults category to 'support' when not provided", async () => {
    const form = new FormData()
    form.append("subject", "Dúvida")
    form.append("message", "Como faço?")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(prismaMock.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "support" }),
      })
    )
  })

  it("tracks ticket_created event after creation", async () => {
    const form = new FormData()
    form.append("subject", "Meu ticket")
    form.append("message", "Descrição")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(trackEventMock).toHaveBeenCalledWith(
      "ticket_created",
      expect.objectContaining({
        userId: "user-1",
        meta: expect.objectContaining({ ticketId: "ticket-1" }),
      })
    )
  })

  it("sends ticket created email with user name", async () => {
    const form = new FormData()
    form.append("subject", "Meu ticket")
    form.append("message", "Descrição")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(sendTicketCreatedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", subject: "Problema com acesso" }),
      "João"
    )
  })

  it("falls back to email when user name is null", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ name: null, email: "user@test.com" })
    const form = new FormData()
    form.append("subject", "Meu ticket")
    form.append("message", "Descrição")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(sendTicketCreatedEmailMock).toHaveBeenCalledWith(
      expect.anything(),
      "user@test.com"
    )
  })

  it("falls back to 'Usuário' when user has no name or email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ name: null, email: null })
    const form = new FormData()
    form.append("subject", "Meu ticket")
    form.append("message", "Descrição")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(sendTicketCreatedEmailMock).toHaveBeenCalledWith(
      expect.anything(),
      "Usuário"
    )
  })

  it("does not upload to S3 when no images are attached", async () => {
    const form = new FormData()
    form.append("subject", "Sem imagens")
    form.append("message", "Apenas texto")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(uploadToS3Mock).not.toHaveBeenCalled()
    expect(prismaMock.ticketMessage.update).not.toHaveBeenCalled()
  })

  it("uploads images to S3 and updates the first message with image URLs", async () => {
    const imageFile = new File(["img-data"], "screenshot.png", { type: "image/png" })
    const form = new FormData()
    form.append("subject", "Com imagens")
    form.append("message", "Veja o screenshot")
    form.append("images", imageFile)
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(uploadToS3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/png",
        body: expect.any(Buffer),
      })
    )
    expect(prismaMock.ticketMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-1" },
        data: { imageUrls: ["https://s3.test/ticket-img.png"] },
      })
    )
  })

  it("uploads multiple images and updates message with all URLs", async () => {
    const image1 = new File(["img1"], "screenshot1.png", { type: "image/png" })
    const image2 = new File(["img2"], "screenshot2.jpg", { type: "image/jpeg" })
    uploadToS3Mock
      .mockResolvedValueOnce({ url: "https://s3.test/img1.png" })
      .mockResolvedValueOnce({ url: "https://s3.test/img2.jpg" })
    const form = new FormData()
    form.append("subject", "Múltiplas imagens")
    form.append("message", "Aqui estão as capturas")
    form.append("images", image1)
    form.append("images", image2)
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(uploadToS3Mock).toHaveBeenCalledTimes(2)
    expect(prismaMock.ticketMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { imageUrls: ["https://s3.test/img1.png", "https://s3.test/img2.jpg"] },
      })
    )
  })

  it("skips message image update when no firstMessage is found", async () => {
    prismaMock.ticketMessage.findFirst.mockResolvedValue(null)
    const imageFile = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    const form = new FormData()
    form.append("subject", "Ticket")
    form.append("message", "Message")
    form.append("images", imageFile)
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(prismaMock.ticketMessage.update).not.toHaveBeenCalled()
  })

  it("trims whitespace from subject and message", async () => {
    const form = new FormData()
    form.append("subject", "  Assunto com espaços  ")
    form.append("message", "  Mensagem com espaços  ")
    const req = new Request("http://localhost/api/tickets", { method: "POST", body: form })
    await POST(req)
    expect(prismaMock.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: "Assunto com espaços",
          messages: expect.objectContaining({
            create: expect.objectContaining({ message: "Mensagem com espaços" }),
          }),
        }),
      })
    )
  })

})
