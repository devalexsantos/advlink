export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { configuredSecret, safeEqual } from "@/lib/billing/secrets"
import { runActivationDrip } from "@/lib/activation/drip"
import { sendActivationEmail } from "@/lib/activation/sender"

/** Hourly activation drip (called by .github/workflows/activation-emails.yml with the CRON_SECRET bearer). */
async function handle(req: Request) {
  const secret = configuredSecret("CRON_SECRET")
  if (!secret) return NextResponse.json({ error: "cron não configurado" }, { status: 503 })
  const auth = req.headers.get("authorization") ?? ""
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "não autorizado" }, { status: 401 })

  const counts = await runActivationDrip({ now: new Date(), prisma, send: sendActivationEmail })
  console.info("[activation] rodada concluída", counts)
  return NextResponse.json(counts)
}

export const GET = handle
export const POST = handle
