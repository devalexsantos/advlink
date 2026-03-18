export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
import { getActiveSiteId } from "@/lib/active-site"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const body = await req.json()
  const { title, description } = body as { title: string; description?: string | null }

  const last = await prisma.activityAreas.findFirst({
    where: { profileId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const nextPosition = (last?.position ?? 0) + 1

  const created = await prisma.activityAreas.create({
    data: { profileId, title, description: description ?? null, position: nextPosition },
  })
  return NextResponse.json({ area: created })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await req.json()
    if (Array.isArray(body?.order)) {
      const order = body.order as { id: string; position: number }[]
      const ids = order.map((o) => o.id)
      const owned = await prisma.activityAreas.findMany({ where: { id: { in: ids }, profileId }, select: { id: true } })
      const ownedSet = new Set(owned.map((o) => o.id))
      const allOwned = ids.every((id: string) => ownedSet.has(id))
      if (!allOwned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      await prisma.$transaction(order.map((o) => prisma.activityAreas.update({ where: { id: o.id }, data: { position: o.position } })))
      return NextResponse.json({ ok: true })
    }

    const { id, title, description, coverImageUrl, position } = body as { id: string; title: string; description?: string | null; coverImageUrl?: string | null; position?: number }

    const existing = await prisma.activityAreas.findFirst({ where: { id, profileId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const newCoverUrl: string | null | undefined = coverImageUrl
    const updated = await prisma.activityAreas.update({
      where: { id },
      data: { title, description: description ?? null, coverImageUrl: newCoverUrl, position: position ?? existing.position },
    })
    return NextResponse.json({ area: updated })
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const id = String(form.get("id") ?? "")
    const title = String(form.get("title") ?? "")
    const description = String(form.get("description") ?? "") || null
    const cover = form.get("cover")

    const existing = await prisma.activityAreas.findFirst({ where: { id, profileId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let coverImageUrl: string | undefined
    if (cover && cover instanceof File) {
      const arrayBuffer = await cover.arrayBuffer()
      const ext = cover.type.split("/")[1] || "jpg"
      const key = `coverAreas/${profileId}.${Date.now()}.${id}.${ext}`
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

  const profileId = await getActiveSiteId(userId)
  if (!profileId) return NextResponse.json({ error: "No site found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get("id") ?? "")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await prisma.activityAreas.findFirst({ where: { id, profileId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.activityAreas.delete({ where: { id } })
  const remaining = await prisma.activityAreas.findMany({ where: { profileId }, orderBy: { position: "asc" } })
  await prisma.$transaction(remaining.map((a, idx) => prisma.activityAreas.update({ where: { id: a.id }, data: { position: idx + 1 } })))

  return NextResponse.json({ ok: true })
}
