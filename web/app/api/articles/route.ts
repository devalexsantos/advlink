export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { ARTICLE_TITLE_MAX, isUniqueViolation, slugifyArticleTitle, uniqueArticleSlug } from "@/lib/articles"

const createSchema = z.object({
  title: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= 1 && v.length <= ARTICLE_TITLE_MAX, {
      message: `Informe um título de até ${ARTICLE_TITLE_MAX} caracteres.`,
    }),
})

async function resolveSite(): Promise<{ error: NextResponse } | { userId: string; profileId: string }> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const profileId = await getActiveSiteId(userId)
  if (!profileId) return { error: NextResponse.json({ error: "No site found" }, { status: 404 }) }
  return { userId, profileId }
}

export async function GET() {
  const site = await resolveSite()
  if ("error" in site) return site.error

  const articles = await prisma.article.findMany({
    where: { profileId: site.profileId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, excerpt: true, coverImageUrl: true, publishedAt: true, updatedAt: true },
  })
  return NextResponse.json({ articles })
}

export async function POST(req: Request) {
  const site = await resolveSite()
  if ("error" in site) return site.error

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
  }
  const { title } = parsed.data
  const base = slugifyArticleTitle(title)

  // One retry covers two drafts with the same title racing for the same slug (@@unique).
  for (let attempt = 0; ; attempt++) {
    const slug = await uniqueArticleSlug(site.profileId, base)
    try {
      const article = await prisma.article.create({
        data: { profileId: site.profileId, title, slug, content: "", status: "draft" },
      })
      return NextResponse.json({ article }, { status: 201 })
    } catch (err) {
      if (!isUniqueViolation(err) || attempt >= 1) throw err
    }
  }
}
