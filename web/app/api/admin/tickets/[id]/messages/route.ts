import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { sendTicketReplyEmail } from "@/lib/emails/ticketEmails"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 })
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType: "admin",
      senderAdminId: admin.id,
      message: message.trim(),
    },
  })

  // Update ticket status to in_progress if it was open
  if (ticket.status === "open") {
    await prisma.ticket.update({
      where: { id },
      data: { status: "in_progress", assignedAdminId: admin.id },
    })
  }

  // Notify user by email
  if (ticket.user.email) {
    sendTicketReplyEmail(
      ticket.number,
      ticket.subject,
      message.trim(),
      ticket.user.email,
      admin.name || admin.email
    ).catch(console.error)
  }

  return NextResponse.json(ticketMessage, { status: 201 })
}
