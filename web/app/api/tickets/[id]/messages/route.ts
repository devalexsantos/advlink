import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendTicketReplyEmail } from "@/lib/emails/ticketEmails"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 })
  }

  // Verify ownership
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId },
    include: { assignedAdmin: { select: { email: true, name: true } } },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType: "user",
      senderUserId: userId,
      message: message.trim(),
    },
  })

  // Reopen ticket if it was resolved/waiting
  if (ticket.status === "resolved" || ticket.status === "waiting_customer") {
    await prisma.ticket.update({
      where: { id },
      data: { status: "open" },
    })
  }

  // Notify assigned admin
  if (ticket.assignedAdmin?.email) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    sendTicketReplyEmail(
      ticket.number,
      ticket.subject,
      message.trim(),
      ticket.assignedAdmin.email,
      user?.name || user?.email || "Usuário"
    ).catch(console.error)
  }

  return NextResponse.json(ticketMessage, { status: 201 })
}
