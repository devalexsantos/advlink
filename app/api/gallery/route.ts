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

  const contentType = req.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 })
  }

  const form = await req.formData()
  const cover = form.get("cover")
  if (!(cover && cover instanceof File)) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 })
  }

  const last = await prisma.gallery.findFirst({ where: { userId }, orderBy: { position: "desc" }, select: { position: true } })
  const nextPosition = (last?.position ?? 0) + 1

  const arrayBuffer = await cover.arrayBuffer()
  const ext = cover.type.split("/")[1] || "jpg"
  const key = `gallery/${userId}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.${ext}`
  const uploaded = await uploadToS3({
    key,
    contentType: cover.type || "image/jpeg",
    body: Buffer.from(arrayBuffer),
    cacheControl: "public, max-age=604800, immutable",
  })

  const created = await prisma.gallery.create({
    data: { userId, coverImageUrl: uploaded.url, position: nextPosition },
  })
  return NextResponse.json({ item: created })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!Array.isArray(body?.order)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  const order = body.order as { id: string; position: number }[]
  const ids = order.map((o) => o.id)
  const owned = await prisma.gallery.findMany({ where: { id: { in: ids }, userId }, select: { id: true } })
  const ownedSet = new Set(owned.map((o) => o.id))
  const allOwned = ids.every((id: string) => ownedSet.has(id))
  if (!allOwned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await prisma.$transaction(order.map((o) => prisma.gallery.update({ where: { id: o.id }, data: { position: o.position } })))
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get("id") ?? "")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await prisma.gallery.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.gallery.delete({ where: { id } })
  const remaining = await prisma.gallery.findMany({ where: { userId }, orderBy: { position: "asc" } })
  await prisma.$transaction(remaining.map((g, idx) => prisma.gallery.update({ where: { id: g.id }, data: { position: idx + 1 } })))

  return NextResponse.json({ ok: true })
}


