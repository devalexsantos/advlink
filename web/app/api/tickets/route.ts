import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
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

  const formData = await req.formData()
  const subject = (formData.get("subject") as string)?.trim() || ""
  const category = (formData.get("category") as string) || "support"
  const message = (formData.get("message") as string)?.trim() || ""
  const imageFiles = formData.getAll("images") as File[]

  if (!subject || !message) {
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 })
  }

  // Create ticket first to get ID for S3 key
  const ticket = await prisma.ticket.create({
    data: {
      userId,
      subject,
      category,
      messages: {
        create: {
          senderType: "user",
          senderUserId: userId,
          message,
        },
      },
    },
  })

  // Upload images and update the message if any
  if (imageFiles.length > 0) {
    const imageUrls: string[] = []
    for (const file of imageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split(".").pop() || "png"
      const random = Math.random().toString(36).slice(2, 8)
      const key = `tickets/${ticket.id}/${Date.now()}.${random}.${ext}`
      const { url } = await uploadToS3({
        key,
        contentType: file.type || "image/png",
        body: buffer,
        cacheControl: "public, max-age=31536000, immutable",
      })
      imageUrls.push(url)
    }

    // Update the first message with image URLs
    const firstMessage = await prisma.ticketMessage.findFirst({
      where: { ticketId: ticket.id },
    })
    if (firstMessage) {
      await prisma.ticketMessage.update({
        where: { id: firstMessage.id },
        data: { imageUrls },
      })
    }
  }

  trackEvent("ticket_created", { userId, meta: { ticketId: ticket.id, number: ticket.number, category } }).catch(() => {})

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  sendTicketCreatedEmail(
    { ticketId: ticket.id, number: ticket.number, subject: ticket.subject, category: ticket.category },
    user?.name || user?.email || "Usuário"
  ).catch(console.error)

  return NextResponse.json(ticket, { status: 201 })
}
