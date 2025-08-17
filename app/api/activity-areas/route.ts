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

  const last = await prisma.activityAreas.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const nextPosition = (last?.position ?? 0) + 1

  const created = await prisma.activityAreas.create({
    data: { userId, title, description: description ?? null, position: nextPosition },
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
    // Two JSON modes:
    // 1) Update fields of a single area
    // 2) Reorder positions for many areas
    if (Array.isArray(body?.order)) {
      const order = body.order as { id: string; position: number }[]
      // Validate ownership
      const ids = order.map((o) => o.id)
      const owned = await prisma.activityAreas.findMany({ where: { id: { in: ids }, userId }, select: { id: true } })
      const ownedSet = new Set(owned.map((o) => o.id))
      const allOwned = ids.every((id: string) => ownedSet.has(id))
      if (!allOwned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      // Apply updates in a transaction
      await prisma.$transaction(order.map((o) => prisma.activityAreas.update({ where: { id: o.id }, data: { position: o.position } })))
      return NextResponse.json({ ok: true })
    }

    const { id, title, description, coverImageUrl, position } = body as { id: string; title: string; description?: string | null; coverImageUrl?: string | null; position?: number }

    const existing = await prisma.activityAreas.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.activityAreas.update({
      where: { id },
      data: { title, description: description ?? null, coverImageUrl, position: position ?? existing.position },
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

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get("id") ?? "")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await prisma.activityAreas.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.activityAreas.delete({ where: { id } })
  // Optional: compact positions after delete
  const remaining = await prisma.activityAreas.findMany({ where: { userId }, orderBy: { position: "asc" } })
  await prisma.$transaction(remaining.map((a, idx) => prisma.activityAreas.update({ where: { id: a.id }, data: { position: idx + 1 } })))

  return NextResponse.json({ ok: true })
}


