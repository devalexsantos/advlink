import { describe, it, expect, vi } from "vitest"

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    user = {}
    profile = {}
  },
}))

describe("prisma singleton", () => {
  it("exports a prisma instance", async () => {
    const { prisma } = await import("@/lib/prisma")
    expect(prisma).toBeDefined()
    expect(typeof prisma).toBe("object")
  })
})
