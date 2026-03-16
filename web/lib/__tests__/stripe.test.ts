import { describe, it, expect, vi } from "vitest"

vi.mock("stripe", () => ({
  default: class MockStripe {
    constructor() {
      return {
        customers: {},
        checkout: { sessions: {} },
        subscriptions: {},
        webhooks: {},
      }
    }
  },
}))

describe("stripe singleton", () => {
  it("exports a stripe instance", async () => {
    const { stripe } = await import("@/lib/stripe")
    expect(stripe).toBeDefined()
    expect(typeof stripe).toBe("object")
  })
})
