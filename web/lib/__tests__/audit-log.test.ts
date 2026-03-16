import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { auditLog: { create: vi.fn() } },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { logAudit } from "@/lib/audit-log"

describe("logAudit()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.auditLog.create.mockResolvedValue({ id: "log-1" })
  })

  it("creates audit log with correct data", async () => {
    await logAudit({
      adminUserId: "admin-1",
      action: "update",
      entityType: "user",
      entityId: "user-1",
      before: { name: "old" },
      after: { name: "new" },
    })

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminUserId: "admin-1",
        action: "update",
        entityType: "user",
        entityId: "user-1",
        beforeJson: { name: "old" },
        afterJson: { name: "new" },
      },
    })
  })

  it("handles undefined before/after", async () => {
    await logAudit({
      adminUserId: "admin-1",
      action: "delete",
      entityType: "user",
      entityId: "user-1",
    })

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminUserId: "admin-1",
        action: "delete",
        entityType: "user",
        entityId: "user-1",
        beforeJson: undefined,
        afterJson: undefined,
      },
    })
  })
})
