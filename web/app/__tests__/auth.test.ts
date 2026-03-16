import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, bcryptMock, trackEventMock, nodemailerMock, createSignInEmailHtmlMock, createSignInEmailTextMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
  bcryptMock: { compare: vi.fn() },
  trackEventMock: vi.fn().mockResolvedValue(undefined),
  nodemailerMock: { createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue(undefined) })) },
  createSignInEmailHtmlMock: vi.fn(() => "<html>sign in</html>"),
  createSignInEmailTextMock: vi.fn(() => "sign in text"),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("bcryptjs", () => ({ default: bcryptMock }))
vi.mock("@/lib/product-events", () => ({ trackEvent: trackEventMock }))
vi.mock("nodemailer", () => ({ default: nodemailerMock }))
vi.mock("@/lib/emails/authEmail", () => ({
  createSignInEmailHtml: createSignInEmailHtmlMock,
  createSignInEmailText: createSignInEmailTextMock,
}))
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({})) }))
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: any) => ({ ...config, type: "credentials" })),
}))
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config: any) => ({ ...config, type: "oauth" })),
}))
vi.mock("next-auth/providers/email", () => ({
  default: vi.fn((config: any) => ({ ...config, type: "email" })),
}))

import { authOptions } from "@/auth"

describe("auth.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("callbacks.jwt", () => {
    it("sets userId on token when user is present", async () => {
      const token = { sub: "xxx" }
      const user = { id: "user-123", email: "a@b.com" }
      const result = await authOptions.callbacks!.jwt!({ token, user } as any)
      expect((result as any).userId).toBe("user-123")
    })

    it("returns token unchanged when no user", async () => {
      const token = { sub: "xxx", userId: "existing" }
      const result = await authOptions.callbacks!.jwt!({ token } as any)
      expect((result as any).userId).toBe("existing")
    })
  })

  describe("callbacks.session", () => {
    it("injects userId into session.user", async () => {
      const session = { user: { name: "Test" }, expires: "" }
      const token = { userId: "user-456" }
      const result = await authOptions.callbacks!.session!({ session, token } as any)
      expect((result.user as any).id).toBe("user-456")
    })

    it("handles missing session.user gracefully", async () => {
      const session = { expires: "" }
      const token = { userId: "user-456" }
      const result = await authOptions.callbacks!.session!({ session, token } as any)
      expect(result).toBeDefined()
    })
  })

  describe("Credentials provider authorize", () => {
    const getAuthorize = () => {
      const credProvider = authOptions.providers.find((p: any) => p.type === "credentials") as any
      return credProvider.authorize
    }

    it("returns null for missing credentials", async () => {
      const authorize = getAuthorize()
      expect(await authorize(null)).toBeNull()
      expect(await authorize({})).toBeNull()
      expect(await authorize({ email: "a@b.com" })).toBeNull()
      expect(await authorize({ password: "123" })).toBeNull()
    })

    it("returns null if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      const authorize = getAuthorize()
      const result = await authorize({ email: "a@b.com", password: "123" })
      expect(result).toBeNull()
    })

    it("returns null if user has no passwordHash", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: null })
      const authorize = getAuthorize()
      const result = await authorize({ email: "a@b.com", password: "123" })
      expect(result).toBeNull()
    })

    it("returns null if password is wrong", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: "hash", name: "Test" })
      bcryptMock.compare.mockResolvedValue(false)
      const authorize = getAuthorize()
      const result = await authorize({ email: "a@b.com", password: "wrong" })
      expect(result).toBeNull()
    })

    it("returns user object on valid credentials", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "hash", name: "Test", image: "/img.png" })
      bcryptMock.compare.mockResolvedValue(true)
      const authorize = getAuthorize()
      const result = await authorize({ email: "a@b.com", password: "correct" })
      expect(result).toEqual({ id: "u1", name: "Test", email: "a@b.com", image: "/img.png" })
    })
  })

  describe("events.createUser", () => {
    it("tracks user_signed_up event", async () => {
      await authOptions.events!.createUser!({ user: { id: "u1", email: "a@b.com" } } as any)
      expect(trackEventMock).toHaveBeenCalledWith("user_signed_up", { userId: "u1", meta: { email: "a@b.com" } })
    })
  })

  describe("config", () => {
    it("uses jwt session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt")
    })

    it("has custom sign-in page", () => {
      expect(authOptions.pages?.signIn).toBe("/login")
    })

    it("has 3 providers", () => {
      expect(authOptions.providers).toHaveLength(3)
    })
  })
})
