import { prisma } from "@/lib/prisma"

interface TrackEventParams {
  userId?: string
  siteId?: string
  meta?: Record<string, unknown>
}

export async function trackEvent(type: string, params: TrackEventParams = {}) {
  return prisma.productEvent.create({
    data: {
      type,
      userId: params.userId,
      siteId: params.siteId,
      metaJson: params.meta ? JSON.parse(JSON.stringify(params.meta)) : undefined,
    },
  })
}
