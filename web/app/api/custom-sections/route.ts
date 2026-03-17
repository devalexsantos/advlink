import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
import { getVideoEmbedUrl } from "@/lib/video-embed"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const title = String(form.get("title") ?? "").trim()
  const description = String(form.get("description") ?? "") || null
  const layout = String(form.get("layout") ?? "text-only")
  const iconName = String(form.get("iconName") ?? "FileText")

  if (!title && layout !== "button") return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
  if (!["image-left", "image-right", "text-only", "video", "button"].includes(layout)) {
    return NextResponse.json({ error: "Layout inválido" }, { status: 400 })
  }

  // Video URL validation
  let videoUrl: string | null = null
  if (layout === "video") {
    const rawVideoUrl = String(form.get("videoUrl") ?? "").trim()
    if (!rawVideoUrl || !getVideoEmbedUrl(rawVideoUrl)) {
      return NextResponse.json({ error: "URL de vídeo inválida. Use YouTube ou Vimeo." }, { status: 400 })
    }
    videoUrl = rawVideoUrl
  }

  // Button config validation
  let buttonConfig: Prisma.InputJsonValue | null = null
  if (layout === "button") {
    try {
      const raw = String(form.get("buttonConfig") ?? "")
      buttonConfig = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: "Configuração de botão inválida." }, { status: 400 })
    }
    const bc = buttonConfig as Record<string, unknown> | null
    if (!bc?.url || !String(bc.url).startsWith("http")) {
      return NextResponse.json({ error: "URL do botão é obrigatória e deve começar com http." }, { status: 400 })
    }
    if (!bc.label) {
      return NextResponse.json({ error: "Texto do botão é obrigatório." }, { status: 400 })
    }
  }

  // Upload image if provided
  let imageUrl: string | null = null
  const imageFile = form.get("image")
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer()
    const ext = imageFile.type.split("/")[1] || "jpg"
    const key = `custom-sections/${userId}.${Date.now()}.${ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: imageFile.type || "image/jpeg",
      body: Buffer.from(arrayBuffer),
      cacheControl: "public, max-age=604800, immutable",
    })
    imageUrl = uploaded.url
  }

  // Get next position
  const lastSection = await prisma.customSection.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const position = (lastSection?.position ?? -1) + 1

  const section = await prisma.customSection.create({
    data: { userId, title, description, imageUrl, layout, iconName, position, videoUrl, buttonConfig: buttonConfig ?? Prisma.JsonNull },
  })

  // Auto-append to profile sectionOrder
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { sectionOrder: true } })
  const currentOrder = (profile?.sectionOrder as string[] | null) ?? []
  const newOrder = [...currentOrder, `custom_${section.id}`]
  await prisma.profile.update({ where: { userId }, data: { sectionOrder: newOrder } })

  return NextResponse.json({ section })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const id = String(form.get("id") ?? "")

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const existing = await prisma.customSection.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: "Seção não encontrada" }, { status: 404 })

  const title = String(form.get("title") ?? existing.title).trim()
  const description = form.has("description") ? (String(form.get("description") ?? "") || null) : existing.description
  const layout = form.has("layout") ? String(form.get("layout") ?? existing.layout) : existing.layout
  const iconName = form.has("iconName") ? String(form.get("iconName") ?? existing.iconName) : existing.iconName

  // Video URL (conditionally update)
  let videoUrl = existing.videoUrl
  if (form.has("videoUrl")) {
    const rawVideoUrl = String(form.get("videoUrl") ?? "").trim()
    videoUrl = rawVideoUrl || null
  }

  // Button config (conditionally update)
  let buttonConfig = existing.buttonConfig
  if (form.has("buttonConfig")) {
    try {
      const raw = String(form.get("buttonConfig") ?? "")
      buttonConfig = raw ? JSON.parse(raw) : null
    } catch {
      buttonConfig = null
    }
  }

  // Upload new image if provided
  let imageUrl = existing.imageUrl
  const removeImage = String(form.get("removeImage") ?? "").toLowerCase() === "true"
  const imageFile = form.get("image")
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer()
    const ext = imageFile.type.split("/")[1] || "jpg"
    const key = `custom-sections/${userId}.${Date.now()}.${ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: imageFile.type || "image/jpeg",
      body: Buffer.from(arrayBuffer),
      cacheControl: "public, max-age=604800, immutable",
    })
    imageUrl = uploaded.url
  } else if (removeImage) {
    imageUrl = null
  }

  const section = await prisma.customSection.update({
    where: { id },
    data: { title, description, imageUrl, layout, iconName, videoUrl, buttonConfig: buttonConfig ?? Prisma.JsonNull },
  })

  return NextResponse.json({ section })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })

  const existing = await prisma.customSection.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: "Seção não encontrada" }, { status: 404 })

  await prisma.customSection.delete({ where: { id } })

  // Remove from profile sectionOrder, sectionLabels, sectionIcons
  const customKey = `custom_${id}`
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { sectionOrder: true, sectionLabels: true, sectionIcons: true },
  })
  const updateData: Record<string, unknown> = {}
  if (profile?.sectionOrder) {
    updateData.sectionOrder = (profile.sectionOrder as string[]).filter((k) => k !== customKey)
  }
  if (profile?.sectionLabels) {
    const labels = { ...(profile.sectionLabels as Record<string, string>) }
    delete labels[customKey]
    updateData.sectionLabels = labels
  }
  if (profile?.sectionIcons) {
    const icons = { ...(profile.sectionIcons as Record<string, string>) }
    delete icons[customKey]
    updateData.sectionIcons = icons
  }
  if (Object.keys(updateData).length > 0) {
    await prisma.profile.update({ where: { userId }, data: updateData })
  }

  return NextResponse.json({ ok: true })
}
