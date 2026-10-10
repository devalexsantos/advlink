export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyUnsubscribeToken } from "@/lib/emails/unsubscribe-token"
import { getAppOrigin } from "@/lib/site-url"

async function optOut(token: string | null) {
  const userId = await verifyUnsubscribeToken(token)
  if (!userId) return false
  // updateMany: a deleted user must not turn into a 500.
  await prisma.user.updateMany({
    where: { id: userId, marketingEmailsOptOutAt: null },
    data: { marketingEmailsOptOutAt: new Date() },
  })
  return true
}

/** Link in the e-mail footer: opts out and shows a confirmation page. */
export async function GET(req: Request) {
  const ok = await optOut(new URL(req.url).searchParams.get("token"))
  return NextResponse.redirect(`${getAppOrigin()}/descadastro${ok ? "" : "?erro=1"}`, 303)
}

/** RFC 8058 one-click (List-Unsubscribe-Post): mail providers POST to the same URL. */
export async function POST(req: Request) {
  const ok = await optOut(new URL(req.url).searchParams.get("token"))
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "token inválido" }, { status: 400 })
}
