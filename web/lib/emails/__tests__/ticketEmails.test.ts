import { describe, it, expect, vi, beforeEach } from "vitest"

const { getResendMock, prismaMock } = vi.hoisted(() => ({
  getResendMock: vi.fn(),
  prismaMock: {
    adminUser: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/resend", () => ({
  getResend: getResendMock,
  EMAIL_FROM: "AdvLink <no-reply@advlink.site>",
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("./baseTemplate", () => ({
  emailTemplate: vi.fn(({ title }: { title: string }) => `<html>${title}</html>`),
}))

import { sendTicketCreatedEmail, sendTicketReplyEmail, sendTicketStatusChangedEmail } from "@/lib/emails/ticketEmails"

describe("ticketEmails", () => {
  const mockSend = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()
    getResendMock.mockReturnValue({ emails: { send: mockSend } })
  })

  describe("sendTicketCreatedEmail", () => {
    const ticket = { ticketId: "t1", number: 42, subject: "Help me", category: "support" }

    it("does nothing if resend is null", async () => {
      getResendMock.mockReturnValue(null)
      await sendTicketCreatedEmail(ticket, "User")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("does nothing if no active admins", async () => {
      prismaMock.adminUser.findMany.mockResolvedValue([])
      await sendTicketCreatedEmail(ticket, "User")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends email to all active admins", async () => {
      prismaMock.adminUser.findMany.mockResolvedValue([{ email: "a1@test.com" }, { email: "a2@test.com" }])
      await sendTicketCreatedEmail(ticket, "John")
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: ["a1@test.com", "a2@test.com"],
        subject: expect.stringContaining("#42"),
      }))
    })
  })

  describe("sendTicketReplyEmail", () => {
    it("does nothing if resend is null", async () => {
      getResendMock.mockReturnValue(null)
      await sendTicketReplyEmail(10, "Bug", "fixed it", "admin@test.com", "Dev")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends reply notification email", async () => {
      await sendTicketReplyEmail(10, "Bug Report", "I fixed it", "admin@test.com", "Dev User")
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: "admin@test.com",
        subject: expect.stringContaining("#10"),
      }))
    })
  })

  describe("sendTicketStatusChangedEmail", () => {
    it("does nothing if resend is null", async () => {
      getResendMock.mockReturnValue(null)
      await sendTicketStatusChangedEmail(5, "Issue", "user@test.com", "resolved")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends status change notification", async () => {
      await sendTicketStatusChangedEmail(5, "Issue", "user@test.com", "resolved")
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: "user@test.com",
        subject: expect.stringContaining("Status atualizado"),
      }))
    })
  })
})
