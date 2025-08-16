export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, description } = body as { title: string; description?: string | null }

  const created = await prisma.activityAreas.create({
    data: { userId, title, description: description ?? null },
  })
  return NextResponse.json({ area: created })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await req.json()
    const { id, title, description, coverImageUrl } = body as { id: string; title: string; description?: string | null; coverImageUrl?: string | null }

    const existing = await prisma.activityAreas.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.activityAreas.update({
      where: { id },
      data: { title, description: description ?? null, coverImageUrl },
    })
    return NextResponse.json({ area: updated })
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const id = String(form.get("id") ?? "")
    const title = String(form.get("title") ?? "")
    const description = String(form.get("description") ?? "") || null
    const cover = form.get("cover")

    const existing = await prisma.activityAreas.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let coverImageUrl: string | undefined
    if (cover && cover instanceof File) {
      const arrayBuffer = await cover.arrayBuffer()
      const ext = cover.type.split("/")[1] || "jpg"
      const key = `coverAreas/${userId}.${Date.now()}.${id}.${ext}`
      const uploaded = await uploadToS3({
        key,
        contentType: cover.type || "image/jpeg",
        body: Buffer.from(arrayBuffer),
        cacheControl: "public, max-age=604800, immutable",
      })
      coverImageUrl = uploaded.url
    }

    const updated = await prisma.activityAreas.update({
      where: { id },
      data: { title, description: description ?? null, coverImageUrl },
    })
    return NextResponse.json({ area: updated })
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 415 })
}


