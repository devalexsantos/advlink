import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
import { MAX_TICKET_IMAGES, MAX_TICKET_IMAGE_BYTES, imageUploadErrorResponse, rejectOversizedRequest, validateImageUploads } from "@/lib/upload-validation"
import { sendTicketReplyEmail } from "@/lib/emails/ticketEmails"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

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

  // Verify ownership
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId },
    include: { assignedAdmin: { select: { email: true, name: true } } },
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
      senderType: "user",
      senderUserId: userId,
      message,
      ...(imageUrls.length > 0 ? { imageUrls } : {}),
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
      message || "(imagem anexada)",
      ticket.assignedAdmin.email,
      user?.name || user?.email || "Usuário"
    ).catch(console.error)
  }

  return NextResponse.json(ticketMessage, { status: 201 })
}
