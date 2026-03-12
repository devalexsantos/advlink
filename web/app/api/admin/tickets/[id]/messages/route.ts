import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { uploadToS3 } from "@/lib/s3"
import { sendTicketReplyEmail } from "@/lib/emails/ticketEmails"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const message = (formData.get("message") as string)?.trim() || ""
  const imageFiles = formData.getAll("images") as File[]

  if (!message && imageFiles.length === 0) {
    return NextResponse.json({ error: "Mensagem ou imagem é obrigatória" }, { status: 400 })
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })

  // Upload images to S3
  const imageUrls: string[] = []
  for (const file of imageFiles) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() || "png"
    const random = Math.random().toString(36).slice(2, 8)
    const key = `tickets/${id}/${Date.now()}.${random}.${ext}`
    const { url } = await uploadToS3({
      key,
      contentType: file.type || "image/png",
      body: buffer,
      cacheControl: "public, max-age=31536000, immutable",
    })
    imageUrls.push(url)
  }

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType: "admin",
      senderAdminId: admin.id,
      message,
      ...(imageUrls.length > 0 ? { imageUrls } : {}),
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
      message || "(imagem anexada)",
      ticket.user.email,
      admin.name || admin.email
    ).catch(console.error)
  }

  return NextResponse.json(ticketMessage, { status: 201 })
}
