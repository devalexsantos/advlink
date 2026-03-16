import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { productEvent: { create: vi.fn() } },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { trackEvent } from "@/lib/product-events"

describe("trackEvent()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.productEvent.create.mockResolvedValue({ id: "evt-1" })
  })

  it("creates event with type and userId", async () => {
    await trackEvent("user_signed_up", { userId: "u1" })

    expect(prismaMock.productEvent.create).toHaveBeenCalledWith({
      data: {
        type: "user_signed_up",
        userId: "u1",
        siteId: undefined,
        metaJson: undefined,
      },
    })
  })

  it("creates event with metadata", async () => {
    await trackEvent("site_created", { userId: "u1", meta: { slug: "john" } })

    expect(prismaMock.productEvent.create).toHaveBeenCalledWith({
      data: {
        type: "site_created",
        userId: "u1",
        siteId: undefined,
        metaJson: { slug: "john" },
      },
    })
  })

  it("creates event with no params", async () => {
    await trackEvent("app_loaded")

    expect(prismaMock.productEvent.create).toHaveBeenCalledWith({
      data: {
        type: "app_loaded",
        userId: undefined,
        siteId: undefined,
        metaJson: undefined,
      },
    })
  })
})
