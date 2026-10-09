export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getBillingDeps } from "@/lib/billing/deps"
import { processWebhookEvent } from "@/lib/billing/sync"
import { configuredSecret, safeEqual } from "@/lib/billing/secrets"

/**
 * Asaas webhook. Authenticated by the `asaas-access-token` header (SEC-4: no token configured → 503,
 * never "accept anything"). Every event is stored once (dedup by event id) and processed inline; a
 * processing failure still answers 200 because the event is safely stored and the billing sweep
 * retries it — Asaas pauses the whole queue after repeated non-2xx answers.
 */
export async function POST(req: Request) {
  const expected = configuredSecret("ASAAS_WEBHOOK_AUTH_TOKEN")
  const deps = getBillingDeps()
  if (!expected || !deps) {
    console.error("[asaas-webhook] ASAAS_WEBHOOK_AUTH_TOKEN/ASAAS_API_KEY não configurados")
    return NextResponse.json({ error: "webhook não configurado" }, { status: 503 })
  }
  if (!safeEqual(req.headers.get("asaas-access-token") ?? "", expected)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { id?: unknown; event?: unknown } | null
  const eventId = typeof body?.id === "string" ? body.id : null
  const eventType = typeof body?.event === "string" ? body.event : null
  if (!eventId || !eventType || eventId.length > 200 || eventType.length > 100) {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 })
  }

  let rowId: string
  try {
    const row = await prisma.webhookEvent.create({
      data: { environment: deps.asaas.environment, eventId, eventType, payload: body as Prisma.InputJsonValue },
      select: { id: true },
    })
    rowId = row.id
  } catch (err) {
    // Redelivery of an event we already stored
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    throw err
  }

  try {
    const result = await processWebhookEvent(deps, rowId)
    return NextResponse.json({ received: true, result })
  } catch (err) {
    console.error("[asaas-webhook] falha ao processar; a varredura vai tentar de novo", { eventId, err: String(err) })
    return NextResponse.json({ received: true, queued: true })
  }
}
