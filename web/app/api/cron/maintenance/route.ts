export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { configuredSecret, safeEqual } from "@/lib/billing/secrets"
import { runMaintenance } from "@/lib/maintenance"

/**
 * Hourly maintenance (called by .github/workflows/maintenance.yml with the CRON_SECRET bearer):
 * LGPD retention purges and other housekeeping. See lib/maintenance.ts.
 */
async function handle(req: Request) {
  const secret = configuredSecret("CRON_SECRET")
  if (!secret) return NextResponse.json({ error: "cron não configurado" }, { status: 503 })
  const auth = req.headers.get("authorization") ?? ""
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "não autorizado" }, { status: 401 })

  const result = await runMaintenance()
  console.info("[maintenance] concluída", result)
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
