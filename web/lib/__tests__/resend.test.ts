import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: vi.fn() }
  },
}))

describe("getResend()", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("returns null without RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY
    const { getResend } = await import("@/lib/resend")
    expect(getResend()).toBeNull()
  })

  it("returns Resend instance with API key", async () => {
    process.env.RESEND_API_KEY = "re_test_key"
    const { getResend } = await import("@/lib/resend")
    const instance = getResend()
    expect(instance).not.toBeNull()
  })
})
