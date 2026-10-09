export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getBillingDeps } from "@/lib/billing/deps"
import { billingSweep } from "@/lib/billing/sync"
import { configuredSecret, safeEqual } from "@/lib/billing/secrets"

/**
 * Hourly billing sweep (called by .github/workflows/billing-sweep.yml with the CRON_SECRET bearer):
 * retries failed webhook events and applies grace / suspension / churn even without a webhook.
 */
async function handle(req: Request) {
  const secret = configuredSecret("CRON_SECRET")
  if (!secret) return NextResponse.json({ error: "cron não configurado" }, { status: 503 })
  const auth = req.headers.get("authorization") ?? ""
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "não autorizado" }, { status: 401 })

  const deps = getBillingDeps()
  if (!deps) return NextResponse.json({ error: "Asaas não configurado" }, { status: 503 })
  const result = await billingSweep(deps)
  console.info("[billing] varredura concluída", result)
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
