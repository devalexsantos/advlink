export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeOptionalRichText } from "@/lib/sanitize-rich-text"
import { generateActivityDescriptions } from "@/lib/openai"
import { uploadToS3 } from "@/lib/s3"
import { MAX_IMAGE_BYTES, imageUploadErrorResponse, rejectOversizedRequest, validateImageUpload, type ValidatedImage } from "@/lib/upload-validation"
import { isReservedSlug } from "@/lib/reserved-slugs"
import { trackEvent } from "@/lib/product-events"
import { getRequestAttribution } from "@/lib/attribution-server"
import { getActiveSiteId } from "@/lib/active-site"
import { MAX_AREA_TITLE_LENGTH, MAX_ONBOARDING_AREAS } from "@/lib/activity-area-limits"
import { rateLimitResponse, rateLimiters } from "@/lib/rate-limit"
import { isValidPracticeType, normalizeOabNumber, normalizeUf } from "@/lib/oab"

const OPENAI_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const resolvedProfileId = await getActiveSiteId(userId)
    if (!resolvedProfileId) return NextResponse.json({ error: "No site found" }, { status: 404 })
    const profileId: string = resolvedProfileId

    const contentType = req.headers.get("content-type") || ""
    let displayName = ""
    let areas: string[] = []
    let about: string | undefined
    let headline: string | undefined
    let email = ""
    let phone: string | undefined
    let cellphone: string | undefined
    let whatsapp: string | undefined
    let instagramUrl: string | undefined
    let calendlyUrl: string | undefined
    let avatarFile: File | undefined
    let oabNumberRaw: unknown
    let oabStateRaw: unknown
    let practiceTypeRaw: unknown

    if (contentType.includes("application/json")) {
      const body = await req.json()
      displayName = body.displayName
      areas = body.areas ?? []
      about = body.about
      headline = body.headline
      email = body.email
      phone = body.phone
      cellphone = body.cellphone
      whatsapp = body.whatsapp
      instagramUrl = body.instagramUrl
      calendlyUrl = body.calendlyUrl
      oabNumberRaw = body.oabNumber
      oabStateRaw = body.oabState
      practiceTypeRaw = body.practiceType
    } else if (contentType.includes("multipart/form-data")) {
      const tooLarge = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
      if (tooLarge) return tooLarge
      const form = await req.formData()
      displayName = String(form.get("displayName") ?? "")
      areas = JSON.parse(String(form.get("areas") ?? "[]"))
      about = String(form.get("about") ?? "") || undefined
      headline = String(form.get("headline") ?? "") || undefined
      email = String(form.get("email") ?? "")
      phone = String(form.get("phone") ?? "") || undefined
      cellphone = String(form.get("cellphone") ?? "") || undefined
      whatsapp = String(form.get("whatsapp") ?? "") || undefined
      instagramUrl = String(form.get("instagramUrl") ?? "") || undefined
      calendlyUrl = String(form.get("calendlyUrl") ?? "") || undefined
      oabNumberRaw = form.get("oabNumber") ?? undefined
      oabStateRaw = form.get("oabState") ?? undefined
      practiceTypeRaw = String(form.get("practiceType") ?? "") || undefined
      const f = form.get("photo")
      if (f && f instanceof File) avatarFile = f
    }

    if (calendlyUrl && !/^https:\/\/calendly\.com\//i.test(calendlyUrl)) {
      return NextResponse.json({ error: "Link do Calendly inválido. Use https://calendly.com/..." }, { status: 400 })
    }

    const oabNumber = normalizeOabNumber(oabNumberRaw)
    if (!oabNumber) {
      return NextResponse.json(
        { error: "Informe um número de OAB válido (até 6 dígitos, com letra opcional, ex.: 123456 ou 123456A)." },
        { status: 400 },
      )
    }
    const oabState = normalizeUf(oabStateRaw)
    if (!oabState) {
      return NextResponse.json({ error: "Selecione a UF (estado) da sua inscrição na OAB." }, { status: 400 })
    }
    if (practiceTypeRaw !== undefined && practiceTypeRaw !== null && practiceTypeRaw !== "" && !isValidPracticeType(practiceTypeRaw)) {
      return NextResponse.json({ error: "Tipo de atuação inválido. Use \"autonomo\" ou \"escritorio\"." }, { status: 400 })
    }
    const practiceType = isValidPracticeType(practiceTypeRaw) ? practiceTypeRaw : null

    // Areas feed the OpenAI prompt: cap count and title length (cost control).
    if (!Array.isArray(areas) || areas.some((a) => typeof a !== "string")) {
      return NextResponse.json({ error: "Áreas de atuação inválidas." }, { status: 400 })
    }
    const titles = Array.from(new Set(areas.map((a) => a.trim()))).filter(Boolean)
    if (titles.length > MAX_ONBOARDING_AREAS) {
      return NextResponse.json(
        { error: `Selecione no máximo ${MAX_ONBOARDING_AREAS} áreas de atuação.` },
        { status: 400 },
      )
    }
    if (titles.some((t) => t.length > MAX_AREA_TITLE_LENGTH)) {
      return NextResponse.json(
        { error: `Cada área de atuação deve ter no máximo ${MAX_AREA_TITLE_LENGTH} caracteres.` },
        { status: 400 },
      )
    }

    const limit = rateLimiters.onboardingByUser.check(userId)
    if (!limit.ok) return rateLimitResponse(limit)

    // Validate the photo before spending on OpenAI or touching S3.
    let avatarImage: ValidatedImage | undefined
    if (avatarFile) {
      const image = await validateImageUpload(avatarFile)
      if (!image.ok) return imageUploadErrorResponse(image)
      avatarImage = image.image
    }

    // 1) Generate area descriptions with OpenAI. Best effort: a missing key, rate limit or
    // timeout must not block onboarding — areas are saved without description instead.
    const openaiKey = process.env.OPENAI_API_KEY ?? ""
    let descriptions: string[] = []
    if (titles.length) {
      try {
        descriptions = await withTimeout(generateActivityDescriptions(titles, openaiKey), OPENAI_TIMEOUT_MS)
      } catch (err) {
        console.error("[onboarding] area description generation failed:", err)
      }
    }

    // 2) Upload avatar if provided
    let avatarUrl: string | null = null
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

    // 2b) Generate unique slug from displayName
    async function slugifyUnique(name: string): Promise<string> {
      const base = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 50)
      let slug = base || 'user'
      if (isReservedSlug(slug)) {
        slug = `${slug}-adv`
      }
      let suffix = 0
      while (true) {
        const exists = await prisma.profile.findFirst({ where: { slug, NOT: { id: profileId } }, select: { id: true } })
        if (!exists) return slug
        suffix++
        const rand = Math.random().toString(36).slice(2, 5)
        slug = `${base}-${suffix}-${rand}`.slice(0, 60)
      }
    }
    const slug = await slugifyUnique(displayName)

    // 3) Update the existing Profile (created when user chose site name)
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        publicName: displayName,
        aboutDescription: sanitizeOptionalRichText(about ?? null),
        headline: headline ?? null,
        publicEmail: email,
        publicPhone: phone ?? null,
        whatsapp: whatsapp ?? cellphone ?? null,
        instagramUrl: instagramUrl ?? null,
        calendlyUrl: calendlyUrl ?? null,
        avatarUrl: avatarUrl ?? undefined,
        oabNumber,
        oabState,
        practiceType,
        slug,
        metaTitle: displayName,
        metaDescription: about ?? null,
        setupComplete: true,
      },
    })

    // 4) Sync ActivityAreas (delete and recreate for this profile)
    await prisma.activityAreas.deleteMany({ where: { profileId } })
    if (titles.length) {
      const data = titles.map((title, i) => ({
        profileId,
        title,
        description: descriptions[i] ? descriptions[i].slice(0, 2000) : null,
        position: i + 1,
      }))
      await prisma.activityAreas.createMany({ data })
    }

    // 5) Also mark user onboarding as complete (backwards compat)
    await prisma.user.update({
      where: { id: userId },
      data: { completed_onboarding: true },
    })

    // Track product event
    const attribution = await getRequestAttribution()
    trackEvent("site_created", { userId, siteId: profileId, meta: { slug, profileId, ...(attribution ? { attribution } : {}) } }).catch(() => {})
    trackEvent("onboarding_completed", { userId, siteId: profileId }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message || 'Internal error') : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
