import { prisma } from "@/lib/prisma"

interface AuditParams {
  adminUserId: string
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
}

export async function logAudit(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      afterJson: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
    },
  })
}
