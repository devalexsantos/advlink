export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { sanitizeRichText } from "@/lib/sanitize-rich-text"
import { uploadToS3 } from "@/lib/s3"
import { MAX_IMAGE_BYTES, imageUploadErrorResponse, rejectOversizedRequest, validateImageUpload } from "@/lib/upload-validation"
import {
  ARTICLE_CONTENT_MAX,
  ARTICLE_EXCERPT_MAX,
  ARTICLE_META_DESCRIPTION_MAX,
  ARTICLE_SLUG_MAX,
  ARTICLE_SLUG_PATTERN,
  ARTICLE_STATUSES,
  ARTICLE_TITLE_MAX,
  isUniqueViolation,
} from "@/lib/articles"
import { toPlainText } from "@/lib/plain-text"

type Ctx = { params: Promise<{ id: string }> }

const SLUG_TAKEN = "Este endereço já está em uso"
const REVIEW_REQUIRED = "Confirme que revisou o conteúdo antes de publicar"

const boolish = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])

/** Optional plain-text field: "" / null clears it. */
const optionalPlain = (max: number, label: string) =>
  z
    .string()
    .nullable()
    .transform((v) => (v ? toPlainText(v) : ""))
    .refine((v) => v.length <= max, { message: `${label} deve ter no máximo ${max} caracteres.` })
    .transform((v) => v || null)

const patchSchema = z.object({
  title: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= 1 && v.length <= ARTICLE_TITLE_MAX, {
      message: `Informe um título de até ${ARTICLE_TITLE_MAX} caracteres.`,
    })
    .optional(),
  slug: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => v.length >= 1 && v.length <= ARTICLE_SLUG_MAX && ARTICLE_SLUG_PATTERN.test(v), {
      message: `Endereço inválido. Use letras minúsculas, números e hífens (até ${ARTICLE_SLUG_MAX} caracteres).`,
    })
    .optional(),
  excerpt: optionalPlain(ARTICLE_EXCERPT_MAX, "O resumo").optional(),
  content: z
    .string()
    .max(ARTICLE_CONTENT_MAX, { message: "O conteúdo é muito longo." })
    .optional(),
  metaDescription: optionalPlain(ARTICLE_META_DESCRIPTION_MAX, "A descrição para buscadores").optional(),
  status: z.enum(ARTICLE_STATUSES, { message: "Status inválido." }).optional(),
  reviewed: boolish.optional(),
  removeCover: boolish.optional(),
})

const FIELDS = ["title", "slug", "excerpt", "content", "metaDescription", "status", "reviewed", "removeCover"] as const

async function resolveSite(): Promise<{ error: NextResponse } | { profileId: string }> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const profileId = await getActiveSiteId(userId)
  if (!profileId) return { error: NextResponse.json({ error: "No site found" }, { status: 404 }) }
  return { profileId }
}

const notFound = () => NextResponse.json({ error: "Artigo não encontrado." }, { status: 404 })

/** Visible text of sanitized HTML (used to reject publishing an empty article). */
function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
}

export async function GET(_req: Request, { params }: Ctx) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { id } = await params

  const article = await prisma.article.findFirst({ where: { id, profileId: site.profileId } })
  if (!article) return notFound()
  return NextResponse.json({ article })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { profileId } = site
  const { id } = await params

  const contentType = req.headers.get("content-type") || ""
  let raw: Record<string, unknown>
  let cover: File | null = null
  if (contentType.includes("multipart/form-data")) {
    const tooLarge = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
    if (tooLarge) return tooLarge
    const form = await req.formData()
    raw = {}
    for (const key of FIELDS) {
      const v = form.get(key)
      if (typeof v === "string") raw[key] = v
    }
    const file = form.get("cover")
    if (file instanceof File) cover = file
  } else if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }
    raw = Object.fromEntries(FIELDS.filter((k) => k in body).map((k) => [k, (body as Record<string, unknown>)[k]]))
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 })
  }

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }
  const input = parsed.data

  const existing = await prisma.article.findFirst({ where: { id, profileId } })
  if (!existing) return notFound()

  const content = input.content !== undefined ? sanitizeRichText(input.content) : undefined
  const title = input.title ?? existing.title
  const finalContent = content ?? existing.content
  const status = input.status ?? existing.status
  const publishing = status === "published"

  if (publishing) {
    // OAB Provimento 205/2021: the lawyer must confirm the (possibly AI-drafted) text before it goes
    // public, whenever the request publishes it or changes the public text.
    const changesPublicText =
      existing.status !== "published" ||
      (input.title !== undefined && input.title !== existing.title) ||
      (content !== undefined && content !== existing.content) ||
      (input.excerpt !== undefined && input.excerpt !== existing.excerpt)
    if (changesPublicText && input.reviewed !== true) {
      return NextResponse.json({ error: REVIEW_REQUIRED }, { status: 400 })
    }
    if (!title.trim() || !hasText(finalContent)) {
      return NextResponse.json({ error: "Preencha o título e o conteúdo antes de publicar." }, { status: 400 })
    }
  }

  if (input.slug !== undefined && input.slug !== existing.slug) {
    const clash = await prisma.article.findFirst({
      where: { profileId, slug: input.slug, NOT: { id: existing.id } },
      select: { id: true },
    })
    if (clash) return NextResponse.json({ error: SLUG_TAKEN }, { status: 409 })
  }

  let coverImageUrl: string | null | undefined
  if (cover) {
    const image = await validateImageUpload(cover)
    if (!image.ok) return imageUploadErrorResponse(image)
    const uploaded = await uploadToS3({
      key: `coverArticles/${profileId}.${Date.now()}.${existing.id}.${image.image.ext}`,
      contentType: image.image.contentType,
      body: image.image.buffer,
      cacheControl: "public, max-age=604800, immutable",
    })
    coverImageUrl = uploaded.url
  } else if (input.removeCover === true) {
    coverImageUrl = null
  }

  try {
    const article = await prisma.article.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content,
        metaDescription: input.metaDescription,
        status: input.status,
        coverImageUrl,
        ...(publishing && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
    })
    return NextResponse.json({ article })
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: SLUG_TAKEN }, { status: 409 })
    throw err
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const site = await resolveSite()
  if ("error" in site) return site.error
  const { id } = await params

  const { count } = await prisma.article.deleteMany({ where: { id, profileId: site.profileId } })
  if (count === 0) return notFound()
  return NextResponse.json({ ok: true })
}
