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
  const { title, description, url } = body as { title: string; description?: string | null; url: string }

  if (!title || !url) return NextResponse.json({ error: "Missing title or url" }, { status: 400 })

  const last = await prisma.links.findFirst({ where: { userId }, orderBy: { position: "desc" }, select: { position: true } })
  const nextPosition = (last?.position ?? 0) + 1

  const created = await prisma.links.create({
    data: { userId, title, description: description ?? null, url, position: nextPosition },
  })
  return NextResponse.json({ link: created })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await req.json()
    if (Array.isArray(body?.order)) {
      const order = body.order as { id: string; position: number }[]
      const ids = order.map((o) => o.id)
      const owned = await prisma.links.findMany({ where: { id: { in: ids }, userId }, select: { id: true } })
      const ownedSet = new Set(owned.map((o) => o.id))
      const allOwned = ids.every((id: string) => ownedSet.has(id))
      if (!allOwned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      await prisma.$transaction(order.map((o) => prisma.links.update({ where: { id: o.id }, data: { position: o.position } })))
      return NextResponse.json({ ok: true })
    }

    const { id, title, description, url, coverImageUrl, position } = body as {
      id: string
      title: string
      description?: string | null
      url: string
      coverImageUrl?: string | null
      position?: number
    }

    const existing = await prisma.links.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.links.update({
      where: { id },
      data: {
        title,
        description: description ?? null,
        url,
        coverImageUrl,
        position: position ?? existing.position,
      },
    })
    return NextResponse.json({ link: updated })
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const id = String(form.get("id") ?? "")
    const title = String(form.get("title") ?? "")
    const description = String(form.get("description") ?? "") || null
    const url = String(form.get("url") ?? "")
    const cover = form.get("cover")

    const existing = await prisma.links.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let coverImageUrl: string | undefined
    if (cover && cover instanceof File) {
      const arrayBuffer = await cover.arrayBuffer()
      const ext = cover.type.split("/")[1] || "jpg"
      const key = `coverLinks/${userId}.${Date.now()}.${id}.${ext}`
      const uploaded = await uploadToS3({
        key,
        contentType: cover.type || "image/jpeg",
        body: Buffer.from(arrayBuffer),
        cacheControl: "public, max-age=604800, immutable",
      })
      coverImageUrl = uploaded.url
    }

    const updated = await prisma.links.update({
      where: { id },
      data: { title, description: description ?? null, url, coverImageUrl },
    })
    return NextResponse.json({ link: updated })
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

  const existing = await prisma.links.findFirst({ where: { id, userId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.links.delete({ where: { id } })
  const remaining = await prisma.links.findMany({ where: { userId }, orderBy: { position: "asc" } })
  await prisma.$transaction(remaining.map((l, idx) => prisma.links.update({ where: { id: l.id }, data: { position: idx + 1 } })))

  return NextResponse.json({ ok: true })
}


