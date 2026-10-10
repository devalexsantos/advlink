// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { getResendMock, sendMock, nodemailerMock, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn()
  return {
    getResendMock: vi.fn(),
    sendMock: vi.fn(),
    sendMailMock,
    nodemailerMock: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
  }
})

vi.mock("@/lib/resend", () => ({
  getResend: getResendMock,
  EMAIL_FROM: "AdvLink <no-reply@advlink.site>",
}))
vi.mock("nodemailer", () => ({ default: nodemailerMock }))

import { sendLoginEmail } from "@/lib/emails/sendLoginEmail"

const URL_WITH_TOKEN = "https://app.advlink.site/api/auth/callback/email?token=SECRET123"

describe("sendLoginEmail", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    getResendMock.mockReturnValue({ emails: { send: sendMock } })
    sendMock.mockResolvedValue({ data: { id: "e1" }, error: null })
    sendMailMock.mockResolvedValue(undefined)
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    errorSpy.mockRestore()
  })

  describe("production", () => {
    beforeEach(() => vi.stubEnv("NODE_ENV", "production"))

    it("sends through Resend with EMAIL_FROM and never touches SMTP", async () => {
      vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com")
      await sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })
      expect(sendMock).toHaveBeenCalledTimes(1)
      const payload = sendMock.mock.calls[0][0]
      expect(payload.from).toBe("AdvLink <no-reply@advlink.site>")
      expect(payload.to).toBe("adv@x.com")
      expect(payload.html).toContain(URL_WITH_TOKEN)
      expect(payload.text).toContain(URL_WITH_TOKEN)
      expect(nodemailerMock.createTransport).not.toHaveBeenCalled()
    })

    it("ignores EMAIL_DEV_TRANSPORT", async () => {
      vi.stubEnv("EMAIL_DEV_TRANSPORT", "mailpit")
      await sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })
      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(nodemailerMock.createTransport).not.toHaveBeenCalled()
    })

    it("throws and logs without leaking the token when Resend returns an error", async () => {
      sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "domain not verified" } })
      await expect(sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })).rejects.toThrow()
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("SECRET123")
    })

    it("throws when the Resend call rejects", async () => {
      sendMock.mockRejectedValue(new Error("network down"))
      await expect(sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })).rejects.toThrow()
      expect(errorSpy).toHaveBeenCalled()
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("SECRET123")
    })

    it("throws when RESEND_API_KEY is missing (no client)", async () => {
      getResendMock.mockReturnValue(null)
      await expect(sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })).rejects.toThrow()
      expect(nodemailerMock.createTransport).not.toHaveBeenCalled()
    })
  })

  describe("development", () => {
    beforeEach(() => vi.stubEnv("NODE_ENV", "development"))

    it("goes to local Mailpit by default, even with a Resend key present", async () => {
      await sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })
      expect(nodemailerMock.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: "127.0.0.1", port: 1025 }),
      )
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "adv@x.com" }))
      expect(sendMock).not.toHaveBeenCalled()
    })

    it("uses Resend when EMAIL_DEV_TRANSPORT=resend", async () => {
      vi.stubEnv("EMAIL_DEV_TRANSPORT", "resend")
      await sendLoginEmail({ to: "adv@x.com", url: URL_WITH_TOKEN })
      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(nodemailerMock.createTransport).not.toHaveBeenCalled()
    })
  })
})
