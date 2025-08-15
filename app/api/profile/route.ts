import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [profile, areas, address] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.activityAreas.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.address.findFirst({ where: { userId } }),
  ])
  return NextResponse.json({ profile, areas, address })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = req.headers.get("content-type") || ""
  let publicName = ""
  let aboutDescription: string | undefined
  let publicEmail = ""
  let publicPhone: string | undefined
  let whatsapp: string | undefined
  let slugInput: string | undefined
  let primaryColor: string | undefined
  let secondaryColor: string | undefined
  let textColor: string | undefined
  let avatarFile: File | undefined
  let coverFile: File | undefined
  let calendlyUrl: string | undefined
  let removeAvatar = false
  let removeCover = false
  // Address
  let addressPublic: string | undefined
  let zipCode: string | undefined
  let street: string | undefined
  let number: string | undefined
  let complement: string | undefined
  let neighborhood: string | undefined
  let city: string | undefined
  let state: string | undefined

  if (contentType.includes("application/json")) {
    const body = await req.json()
    publicName = body.publicName
    aboutDescription = body.aboutDescription
    publicEmail = body.publicEmail
    publicPhone = body.publicPhone
    whatsapp = body.whatsapp
    slugInput = body.slug
    primaryColor = body.primaryColor
    secondaryColor = body.secondaryColor
    textColor = body.textColor
    calendlyUrl = body.calendlyUrl
    removeAvatar = Boolean(body.removeAvatar)
    removeCover = Boolean(body.removeCover)
    addressPublic = body.addressPublic
    zipCode = body.zipCode
    street = body.street
    number = body.number
    complement = body.complement
    neighborhood = body.neighborhood
    city = body.city
    state = body.state
  } else if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    publicName = String(form.get("publicName") ?? "")
    aboutDescription = String(form.get("aboutDescription") ?? "")
    publicEmail = String(form.get("publicEmail") ?? "")
    publicPhone = String(form.get("publicPhone") ?? "")
    whatsapp = String(form.get("whatsapp") ?? "")
    slugInput = String(form.get("slug") ?? "") || undefined
    primaryColor = String(form.get("primaryColor") ?? "") || undefined
    secondaryColor = String(form.get("secondaryColor") ?? "") || undefined
    textColor = String(form.get("textColor") ?? "") || undefined
    calendlyUrl = String(form.get("calendlyUrl") ?? "")
    removeAvatar = String(form.get("removeAvatar") ?? "").toLowerCase() === "true"
    removeCover = String(form.get("removeCover") ?? "").toLowerCase() === "true"
    addressPublic = String(form.get("addressPublic") ?? "")
    zipCode = String(form.get("zipCode") ?? "")
    street = String(form.get("street") ?? "")
    number = String(form.get("number") ?? "")
    complement = String(form.get("complement") ?? "")
    neighborhood = String(form.get("neighborhood") ?? "")
    city = String(form.get("city") ?? "")
    state = String(form.get("state") ?? "")
    const f = form.get("photo")
    if (f && f instanceof File) avatarFile = f
    const c = form.get("cover")
    if (c && c instanceof File) coverFile = c
  }

  // Validação de slug (opcional): se vier slugInput, checa unicidade
  async function validateOrGenerateSlug(name: string, input?: string) {
    function baseFrom(text: string) {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 60)
    }
    const desired = input ? baseFrom(input) : baseFrom(name) || 'user'
    let slug = desired
    let attempts = 0
    while (true) {
      const exists = await prisma.profile.findFirst({ where: { slug, NOT: { userId } }, select: { id: true } })
      if (!exists) return slug
      attempts++
      const rand = Math.random().toString(36).slice(2, 6)
      slug = `${desired}-${attempts}-${rand}`.slice(0, 60)
    }
  }
  const slug = await validateOrGenerateSlug(publicName, slugInput)

  // Upload opcional do avatar
  let avatarUrl: string | undefined
  if (avatarFile) {
    const arrayBuffer = await avatarFile.arrayBuffer()
    const ext = avatarFile.type.split("/")[1] || "jpg"
    const key = `avatars/${userId}.${Date.now()}.${ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: avatarFile.type || "image/jpeg",
      body: Buffer.from(arrayBuffer),
      cacheControl: "public, max-age=604800, immutable",
    })
    avatarUrl = uploaded.url
  }
  if (removeAvatar) {
    avatarUrl = null as any
  }

  // Upload opcional da capa
  let coverUrl: string | undefined
  if (coverFile) {
    const arrayBuffer = await coverFile.arrayBuffer()
    const ext = coverFile.type.split("/")[1] || "jpg"
    const key = `covers/${userId}.${Date.now()}.${ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: coverFile.type || "image/jpeg",
      body: Buffer.from(arrayBuffer),
      cacheControl: "public, max-age=604800, immutable",
    })
    coverUrl = uploaded.url
  }
  if (removeCover) {
    coverUrl = null as any
  }

  function nopt(val?: string) {
    if (val === undefined) return undefined
    const v = String(val).trim()
    return v.length === 0 ? null : v
  }

  // Validate Calendly URL if provided
  function validateCalendly(url?: string) {
    const v = nopt(url)
    if (v == null) return v
    const ok = /^https:\/\/calendly\.com\//i.test(v)
    if (!ok) {
      throw NextResponse.json({ error: "calendlyUrl inválida. Use https://calendly.com/..." }, { status: 400 })
    }
    return v
  }

  const updated = await prisma.profile.upsert({
    where: { userId },
    update: {
      publicName,
      aboutDescription: nopt(aboutDescription),
      publicEmail: nopt(publicEmail),
      publicPhone: nopt(publicPhone),
      whatsapp: nopt(whatsapp),
      avatarUrl,
      slug,
      primaryColor,
      secondaryColor,
      textColor,
      coverUrl,
      calendlyUrl: validateCalendly(calendlyUrl),
    },
    create: {
      userId,
      publicName,
      aboutDescription: nopt(aboutDescription),
      publicEmail: nopt(publicEmail),
      publicPhone: nopt(publicPhone),
      whatsapp: nopt(whatsapp),
      avatarUrl,
      slug,
      primaryColor,
      secondaryColor,
      textColor,
      coverUrl,
      calendlyUrl: validateCalendly(calendlyUrl),
    },
  })
  // Upsert Address if any field provided (including boolean public)
  const anyAddressFieldProvided = [addressPublic, zipCode, street, number, complement, neighborhood, city, state]
    .some((v) => (v !== undefined && String(v).trim() !== ""))

  if (anyAddressFieldProvided) {
    const existing = await prisma.address.findFirst({ where: { userId } })
    const toBool = (val?: string) => {
      if (val === undefined) return undefined
      const v = String(val).trim().toLowerCase()
      if (v === "" ) return undefined
      if (["true","1","on","yes"].includes(v)) return true
      if (["false","0","off","no"].includes(v)) return false
      return undefined
    }
    if (existing) {
      await prisma.address.update({
        where: { id: existing.id },
        data: {
          public: toBool(addressPublic) ?? existing.public,
          zipCode: nopt(zipCode),
          street: nopt(street),
          number: nopt(number),
          complement: nopt(complement),
          neighborhood: nopt(neighborhood),
          city: nopt(city),
          state: nopt(state),
        },
      })
    } else {
      await prisma.address.create({
        data: {
          userId,
          public: toBool(addressPublic) ?? true,
          zipCode: nopt(zipCode),
          street: nopt(street),
          number: nopt(number),
          complement: nopt(complement),
          neighborhood: nopt(neighborhood),
          city: nopt(city),
          state: nopt(state),
        },
      })
    }
  }

  return NextResponse.json({ profile: updated })
}


