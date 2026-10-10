// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { SignJWT } from "jose"
import { signUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token"

const SECRET = "s".repeat(40)

describe("unsubscribe token", () => {
  beforeEach(() => {
    process.env.EMAIL_UNSUBSCRIBE_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.EMAIL_UNSUBSCRIBE_SECRET
  })

  it("round-trips the user id", async () => {
    const token = await signUnsubscribeToken("user1")
    expect(await verifyUnsubscribeToken(token)).toBe("user1")
  })

  it("rejects tampered, empty and foreign-secret tokens", async () => {
    const token = (await signUnsubscribeToken("user1"))!
    expect(await verifyUnsubscribeToken(token.slice(0, -2) + "xx")).toBeNull()
    expect(await verifyUnsubscribeToken("")).toBeNull()
    expect(await verifyUnsubscribeToken(null)).toBeNull()
    process.env.EMAIL_UNSUBSCRIBE_SECRET = "o".repeat(40)
    expect(await verifyUnsubscribeToken(token)).toBeNull()
  })

  it("rejects a token signed for another purpose", async () => {
    const other = await new SignJWT({ purpose: "other" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user1")
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyUnsubscribeToken(other)).toBeNull()
  })

  it("does nothing without a (long enough) secret", async () => {
    process.env.EMAIL_UNSUBSCRIBE_SECRET = "short"
    expect(await signUnsubscribeToken("user1")).toBeNull()
    expect(await verifyUnsubscribeToken("x.y.z")).toBeNull()
  })
})
