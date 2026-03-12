import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTicketCreatedEmail } from "@/lib/emails/ticketEmails"
import { trackEvent } from "@/lib/product-events"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const tickets = await prisma.ticket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  })

  return NextResponse.json(tickets)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { subject, category, message } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 })
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId,
      subject: subject.trim(),
      category: category || "support",
      messages: {
        create: {
          senderType: "user",
          senderUserId: userId,
          message: message.trim(),
        },
      },
    },
  })

  trackEvent("ticket_created", { userId, meta: { ticketId: ticket.id, number: ticket.number, category } }).catch(() => {})

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  sendTicketCreatedEmail(
    { ticketId: ticket.id, number: ticket.number, subject: ticket.subject, category: ticket.category },
    user?.name || user?.email || "Usuário"
  ).catch(console.error)

  return NextResponse.json(ticket, { status: 201 })
}
