export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { configuredSecret, safeEqual } from "@/lib/billing/secrets"
import { runActivationDrip } from "@/lib/activation/drip"
import { runMonthlyReports } from "@/lib/activation/monthly-report"
import { sendActivationEmail, sendMonthlyReportEmail } from "@/lib/activation/sender"

/** Hourly activation drip + monthly reports (called by .github/workflows/activation-emails.yml with the CRON_SECRET bearer). */
async function handle(req: Request) {
  const secret = configuredSecret("CRON_SECRET")
  if (!secret) return NextResponse.json({ error: "cron não configurado" }, { status: 503 })
  const auth = req.headers.get("authorization") ?? ""
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "não autorizado" }, { status: 401 })

  const now = new Date()
  const drip = await runActivationDrip({ now, prisma, send: sendActivationEmail })
  // A failure in the monthly report must not hide the drip result.
  const monthly = await runMonthlyReports({ now, prisma, send: sendMonthlyReportEmail }).catch((e) => {
    console.error("[monthly-report] rodada falhou", e)
    return { sent: 0, skipped: 0, failed: 0, error: true }
  })
  console.info("[activation] rodada concluída", { drip, monthly })
  return NextResponse.json({ drip, monthly })
}

export const GET = handle
export const POST = handle
