import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeOptionalRichText } from "@/lib/sanitize-rich-text"
import { uploadToS3 } from "@/lib/s3"
import { MAX_IMAGE_BYTES, imageUploadErrorResponse, rejectOversizedRequest, validateImageUpload, type ValidatedImage } from "@/lib/upload-validation"
import { isReservedSlug } from "@/lib/reserved-slugs"
import { getActiveSiteId } from "@/lib/active-site"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resolvedProfileId = await getActiveSiteId(userId)
  if (!resolvedProfileId) return NextResponse.json({ error: "No site found" }, { status: 404 })
  const profileId: string = resolvedProfileId

  const [profile, areas, address, links, gallery, customSections, teamMembers] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId } }),
    prisma.activityAreas.findMany({ where: { profileId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.address.findUnique({ where: { profileId } }),
    prisma.links.findMany({ where: { profileId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.gallery.findMany({ where: { profileId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.customSection.findMany({ where: { profileId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.teamMember.findMany({ where: { profileId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ])
  return NextResponse.json({ profile, areas, address, links, gallery, customSections, teamMembers, profileId })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resolvedProfileId = await getActiveSiteId(userId)
  if (!resolvedProfileId) return NextResponse.json({ error: "No site found" }, { status: 404 })
  const profileId: string = resolvedProfileId

  const contentType = req.headers.get("content-type") || ""
  let publicName = ""
  let aboutDescription: string | undefined
  let publicEmail = ""
  let publicPhone: string | undefined
  let headline: string | undefined
  let whatsapp: string | undefined
  let instagramUrl: string | undefined
  let slugInput: string | undefined
  let primaryColor: string | undefined
  let secondaryColor: string | undefined
  let textColor: string | undefined
  let publicPhoneIsFixed: boolean | undefined
  let whatsappIsFixed: boolean | undefined
  let avatarFile: File | undefined
  let coverFile: File | undefined
  let calendlyUrl: string | undefined
  let theme: string | undefined
  // SEO
  let metaTitle: string | undefined
  let metaDescription: string | undefined
  let keywords: string | undefined
  let gtmContainerId: string | undefined
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

    // Handle section config update (sectionOrder / sectionLabels / sectionIcons)
    if (body.sectionOrder !== undefined || body.sectionLabels !== undefined || body.sectionIcons !== undefined || body.sectionTitleHidden !== undefined) {
      const updateData: Record<string, unknown> = {}
      if (body.sectionOrder !== undefined) updateData.sectionOrder = body.sectionOrder
      if (body.sectionLabels !== undefined) updateData.sectionLabels = body.sectionLabels
      if (body.sectionIcons !== undefined) updateData.sectionIcons = body.sectionIcons
      if (body.sectionTitleHidden !== undefined) updateData.sectionTitleHidden = body.sectionTitleHidden
      const updated = await prisma.profile.update({
        where: { id: profileId },
        data: updateData,
      })
      return NextResponse.json({ profile: updated })
    }

    publicName = body.publicName
    aboutDescription = body.aboutDescription
    publicEmail = body.publicEmail
    publicPhone = body.publicPhone
    headline = body.headline
    publicPhoneIsFixed = typeof body.publicPhoneIsFixed === "boolean" ? body.publicPhoneIsFixed : undefined
    whatsapp = body.whatsapp
    whatsappIsFixed = typeof body.whatsappIsFixed === "boolean" ? body.whatsappIsFixed : undefined
    instagramUrl = body.instagramUrl
    slugInput = body.slug
    primaryColor = body.primaryColor
    secondaryColor = body.secondaryColor
    textColor = body.textColor
    calendlyUrl = body.calendlyUrl
    metaTitle = body.metaTitle
    metaDescription = body.metaDescription
    keywords = body.keywords
    gtmContainerId = body.gtmContainerId
    theme = body.theme
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
    const tooLarge = rejectOversizedRequest(req, MAX_IMAGE_BYTES, 2)
    if (tooLarge) return tooLarge
    const form = await req.formData()
    publicName = String(form.get("publicName") ?? "")
    aboutDescription = String(form.get("aboutDescription") ?? "")
    publicEmail = String(form.get("publicEmail") ?? "")
    publicPhone = String(form.get("publicPhone") ?? "")
    headline = String(form.get("headline") ?? "")
    {
      const raw = form.get("publicPhoneIsFixed")
      if (raw !== null) {
        const v = String(raw).trim().toLowerCase()
        if (["true","1","on","yes"].includes(v)) publicPhoneIsFixed = true
        else if (["false","0","off","no"].includes(v)) publicPhoneIsFixed = false
      }
    }
    whatsapp = String(form.get("whatsapp") ?? "")
    {
      const raw = form.get("whatsappIsFixed")
      if (raw !== null) {
        const v = String(raw).trim().toLowerCase()
        if (["true","1","on","yes"].includes(v)) whatsappIsFixed = true
        else if (["false","0","off","no"].includes(v)) whatsappIsFixed = false
      }
    }
    instagramUrl = String(form.get("instagramUrl") ?? "")
    slugInput = String(form.get("slug") ?? "") || undefined
    primaryColor = String(form.get("primaryColor") ?? "") || undefined
    secondaryColor = String(form.get("secondaryColor") ?? "") || undefined
    textColor = String(form.get("textColor") ?? "") || undefined
    calendlyUrl = String(form.get("calendlyUrl") ?? "")
    metaTitle = String(form.get("metaTitle") ?? "") || undefined
    metaDescription = String(form.get("metaDescription") ?? "") || undefined
    keywords = String(form.get("keywords") ?? "") || undefined
    gtmContainerId = String(form.get("gtmContainerId") ?? "") || undefined
    theme = String(form.get("theme") ?? "") || undefined
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

  // Slug validation: check uniqueness excluding current profile
  // Validate URL/ID fields before any upload. The validators throw a 400 NextResponse, which must
  // be returned (a thrown Response becomes a 500 in a route handler).
  let validated: { instagramUrl: string | null | undefined; calendlyUrl: string | null | undefined; gtmContainerId: string | null | undefined }
  try {
    validated = {
      instagramUrl: validateInstagram(instagramUrl),
      calendlyUrl: validateCalendly(calendlyUrl),
      gtmContainerId: validateGtm(gtmContainerId),
    }
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  if (theme !== undefined && !["modern", "classic", "corporate"].includes(theme)) {
    return NextResponse.json({ error: "Tema inválido" }, { status: 400 })
  }

  // Validate image files (magic bytes + size) before any upload.
  let avatarImage: ValidatedImage | undefined
  let coverImage: ValidatedImage | undefined
  if (avatarFile) {
    const image = await validateImageUpload(avatarFile)
    if (!image.ok) return imageUploadErrorResponse(image)
    avatarImage = image.image
  }
  if (coverFile) {
    const image = await validateImageUpload(coverFile)
    if (!image.ok) return imageUploadErrorResponse(image)
    coverImage = image.image
  }

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
    let desired = input ? baseFrom(input) : baseFrom(name) || 'user'
    if (isReservedSlug(desired)) {
      desired = `${desired}-adv`
    }
    let slug = desired
    let attempts = 0
    while (true) {
      const exists = await prisma.profile.findFirst({ where: { slug, NOT: { id: profileId } }, select: { id: true } })
      if (!exists) return slug
      attempts++
      const rand = Math.random().toString(36).slice(2, 6)
      slug = `${desired}-${attempts}-${rand}`.slice(0, 60)
    }
  }
  let slug: string | undefined
  if (slugInput !== undefined) {
    slug = await validateOrGenerateSlug(publicName, slugInput)
  }

  // Upload avatar
  let avatarUrl: string | null | undefined
  if (avatarImage) {
    const key = `avatars/${profileId}.${Date.now()}.${avatarImage.ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: avatarImage.contentType,
      body: avatarImage.buffer,
      cacheControl: "public, max-age=604800, immutable",
    })
    avatarUrl = uploaded.url
  }
  if (removeAvatar) {
    avatarUrl = null
  }

  // Upload cover
  let coverUrl: string | null | undefined
  if (coverImage) {
    const key = `covers/${profileId}.${Date.now()}.${coverImage.ext}`
    const uploaded = await uploadToS3({
      key,
      contentType: coverImage.contentType,
      body: coverImage.buffer,
      cacheControl: "public, max-age=604800, immutable",
    })
    coverUrl = uploaded.url
  }
  if (removeCover) {
    coverUrl = null
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

  // GTM container IDs end up inside an inline <script>, so only the official format is accepted
  function validateGtm(id?: string) {
    const v = nopt(id)
    if (v == null) return v
    const upper = v.toUpperCase()
    if (!/^GTM-[A-Z0-9]{4,10}$/.test(upper)) {
      throw NextResponse.json({ error: "ID do Google Tag Manager inválido. Use o formato GTM-XXXXXXX." }, { status: 400 })
    }
    return upper
  }

  // Validate Instagram URL if provided
  function validateInstagram(url?: string) {
    const v = nopt(url)
    if (v == null) return v
    const ok = /^https:\/\/(www\.)?instagram\.com\//i.test(v)
    if (!ok) {
      throw NextResponse.json({ error: "instagramUrl inválida. Use https://instagram.com/..." }, { status: 400 })
    }
    return v
  }

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: {
      publicName,
      aboutDescription: sanitizeOptionalRichText(nopt(aboutDescription)),
      publicEmail: nopt(publicEmail),
      publicPhone: nopt(publicPhone),
      headline: nopt(headline),
      publicPhoneIsFixed,
      whatsapp: nopt(whatsapp),
      whatsappIsFixed,
      instagramUrl: validated.instagramUrl,
      avatarUrl,
      slug,
      primaryColor,
      secondaryColor,
      textColor,
      coverUrl,
      calendlyUrl: validated.calendlyUrl,
      metaTitle: nopt(metaTitle),
      metaDescription: nopt(metaDescription),
      keywords: nopt(keywords),
      gtmContainerId: validated.gtmContainerId,
      theme,
    },
  })

  // Upsert address
  const toBool = (val?: string) => {
    if (val === undefined) return undefined
    const v = String(val).trim().toLowerCase()
    if (v === "") return undefined
    if (["true","1","on","yes"].includes(v)) return true
    if (["false","0","off","no"].includes(v)) return false
    return undefined
  }
  const addressData = {
    public: toBool(addressPublic) ?? true,
    zipCode: nopt(zipCode),
    street: nopt(street),
    number: nopt(number),
    complement: nopt(complement),
    neighborhood: nopt(neighborhood),
    city: nopt(city),
    state: nopt(state),
  }
  await prisma.address.upsert({
    where: { profileId },
    update: addressData,
    create: { profileId, ...addressData },
  })

  const address = await prisma.address.findUnique({ where: { profileId } })
  return NextResponse.json({ profile: updated, address })
}
