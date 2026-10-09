import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin-auth"
import { uploadToS3 } from "@/lib/s3"
import { MAX_TICKET_IMAGES, MAX_TICKET_IMAGE_BYTES, imageUploadErrorResponse, rejectOversizedRequest, validateImageUploads } from "@/lib/upload-validation"
import { sendTicketReplyEmail } from "@/lib/emails/ticketEmails"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const tooLarge = rejectOversizedRequest(req, MAX_TICKET_IMAGE_BYTES, MAX_TICKET_IMAGES)
  if (tooLarge) return tooLarge
  const formData = await req.formData()
  const message = (formData.get("message") as string)?.trim() || ""
  const imageEntries = formData.getAll("images")

  if (!message && imageEntries.length === 0) {
    return NextResponse.json({ error: "Mensagem ou imagem é obrigatória" }, { status: 400 })
  }

  const validated = await validateImageUploads(imageEntries, {
    maxBytes: MAX_TICKET_IMAGE_BYTES,
    maxFiles: MAX_TICKET_IMAGES,
  })
  if (!validated.ok) return imageUploadErrorResponse(validated)

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })

  // Upload images to S3
  const imageUrls: string[] = []
  for (const image of validated.images) {
    const random = Math.random().toString(36).slice(2, 8)
    const key = `tickets/${id}/${Date.now()}.${random}.${image.ext}`
    const { url } = await uploadToS3({
      key,
      contentType: image.contentType,
      body: image.buffer,
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
