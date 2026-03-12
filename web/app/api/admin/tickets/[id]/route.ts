import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { sendTicketStatusChangedEmail } from "@/lib/emails/ticketEmails"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedAdmin: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          senderUser: { select: { name: true, email: true } },
          senderAdmin: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })
  return NextResponse.json(ticket)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, priority, category, assignedAdminId } = body

  const data: Record<string, unknown> = {}
  if (status) data.status = status
  if (priority) data.priority = priority
  if (category) data.category = category
  if (assignedAdminId !== undefined) data.assignedAdminId = assignedAdminId || null

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { user: { select: { email: true, name: true } } },
  })

  if (status && ticket.user.email) {
    sendTicketStatusChangedEmail(ticket.number, ticket.subject, ticket.user.email, status).catch(console.error)
  }

  return NextResponse.json(ticket)
}
