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

  const form = await req.formData()
  const name = String(form.get("name") ?? "").trim()
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  const description = String(form.get("description") ?? "") || null
  const phone = String(form.get("phone") ?? "") || null
  const whatsapp = String(form.get("whatsapp") ?? "") || null
  const email = String(form.get("email") ?? "") || null
  const avatar = form.get("avatar")

  const last = await prisma.teamMember.findFirst({
    where: { profileId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const nextPosition = (last?.position ?? 0) + 1

  const created = await prisma.teamMember.create({
    data: { profileId, name, description, phone, whatsapp, email, position: nextPosition },
  })

  let avatarUrl: string | undefined
  if (avatar && avatar instanceof File) {
    const arrayBuffer = await avatar.arrayBuffer()
    const ext = avatar.type.split("/")[1] || "jpg"
    const key = `team/${profileId}.${Date.now()}.${created.id}.${ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: avatar.type || "image/jpeg",
      body: Buffer.from(arrayBuffer),
      cacheControl: "public, max-age=604800, immutable",
    })
    avatarUrl = uploaded.url
  }

  if (avatarUrl) {
    const updated = await prisma.teamMember.update({
      where: { id: created.id },
      data: { avatarUrl },
    })
    return NextResponse.json({ member: updated })
  }

  return NextResponse.json({ member: created })
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
      const owned = await prisma.teamMember.findMany({ where: { id: { in: ids }, profileId }, select: { id: true } })
      const ownedSet = new Set(owned.map((o) => o.id))
      const allOwned = ids.every((id: string) => ownedSet.has(id))
      if (!allOwned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      await prisma.$transaction(order.map((o) => prisma.teamMember.update({ where: { id: o.id }, data: { position: o.position } })))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const id = String(form.get("id") ?? "")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const existing = await prisma.teamMember.findFirst({ where: { id, profileId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const name = String(form.get("name") ?? "").trim() || existing.name
    const description = form.has("description") ? (String(form.get("description") ?? "") || null) : existing.description
    const phone = form.has("phone") ? (String(form.get("phone") ?? "") || null) : existing.phone
    const whatsapp = form.has("whatsapp") ? (String(form.get("whatsapp") ?? "") || null) : existing.whatsapp
    const email = form.has("email") ? (String(form.get("email") ?? "") || null) : existing.email

    const removeAvatar = String(form.get("removeAvatar") ?? "").toLowerCase() === "true"
    const avatar = form.get("avatar")

    let avatarUrl: string | null | undefined
    if (removeAvatar) {
      avatarUrl = null
    } else if (avatar && avatar instanceof File) {
      const arrayBuffer = await avatar.arrayBuffer()
      const ext = avatar.type.split("/")[1] || "jpg"
      const key = `team/${profileId}.${Date.now()}.${id}.${ext}`
      const uploaded = await uploadToS3({
        key,
        contentType: avatar.type || "image/jpeg",
        body: Buffer.from(arrayBuffer),
        cacheControl: "public, max-age=604800, immutable",
      })
      avatarUrl = uploaded.url
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        name,
        description,
        phone,
        whatsapp,
        email,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
    })
    return NextResponse.json({ member: updated })
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

  const existing = await prisma.teamMember.findFirst({ where: { id, profileId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.teamMember.delete({ where: { id } })
  const remaining = await prisma.teamMember.findMany({ where: { profileId }, orderBy: { position: "asc" } })
  await prisma.$transaction(remaining.map((m, idx) => prisma.teamMember.update({ where: { id: m.id }, data: { position: idx + 1 } })))

  return NextResponse.json({ ok: true })
}
