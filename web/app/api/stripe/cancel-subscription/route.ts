import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true, email: true } })
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "Sem cliente Stripe" }, { status: 400 })

  // Coleta motivo e detalhes enviados pelo cliente
  let reason: string | undefined
  let details: string | undefined
  try {
    const body = await req.json().catch(() => ({})) as { reason?: string; details?: string }
    reason = body?.reason
    details = body?.details
  } catch {
    // ignora parse
  }

  // Procura uma assinatura ativa/trial/past_due
  const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 })
  const sub = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status))
  if (!sub) return NextResponse.json({ error: "Nenhuma assinatura ativa" }, { status: 400 })

  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true })

  // Envia email de notificação de cancelamento
  try {
    const sessionEmail = (session?.user as { email?: string } | undefined)?.email
    const userEmail = sessionEmail || user.email || "(desconhecido)"
    const host = process.env.EMAIL_SERVER_HOST
    const port = Number(process.env.EMAIL_SERVER_PORT || 587)
    const userEnv = process.env.EMAIL_SERVER_USER
    const passEnv = process.env.EMAIL_SERVER_PASSWORD
    const useSecure = port === 465
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: useSecure,
      requireTLS: !useSecure,
      auth: userEnv && passEnv ? { user: userEnv, pass: passEnv } : undefined,
    } as nodemailer.TransportOptions)

    const subject = "Cancelamento de assinatura"
    const to = "advlinkcontato@gmail.com"
    const html = `
      <div style="font-family:Arial, Helvetica, sans-serif;font-size:14px;color:#111827">
        <p><strong>Usuário (email):</strong> ${escapeHtml(userEmail)}</p>
        <p><strong>Motivo:</strong> ${reason ? escapeHtml(reason) : "(não informado)"}</p>
        <p><strong>Detalhes:</strong></p>
        <p style="white-space:pre-wrap">${details ? escapeHtml(details) : "(sem detalhes)"}</p>
      </div>
    `
    const text = `Usuário (email): ${userEmail}\n\nMotivo: ${reason || "(não informado)"}\n\nDetalhes:\n${details || "(sem detalhes)"}`
    await transport.sendMail({
      to,
      from: process.env.EMAIL_FROM || "AdvLink <no-reply@advlink.local>",
      subject,
      text,
      html,
    })
  } catch (e) {
    // não falha o request por erro de email
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(s?: string) {
  if (!s) return ""
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}


