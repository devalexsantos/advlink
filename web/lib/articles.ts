import { prisma } from "@/lib/prisma"

export const ARTICLE_STATUSES = ["draft", "published"] as const
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]

export const ARTICLE_SLUG_MAX = 80
export const ARTICLE_TITLE_MAX = 150
export const ARTICLE_EXCERPT_MAX = 300
export const ARTICLE_META_DESCRIPTION_MAX = 160
export const ARTICLE_CONTENT_MAX = 100_000

/** Lowercase a-z0-9 words joined by single hyphens. */
export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Fields a public page (list/card) needs. */
export const PUBLIC_ARTICLE_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
} as const

/** How many recent articles the site home ("artigos" section) shows. */
export const HOME_ARTICLES_LIMIT = 3

/** URL slug from a title: lowercase, no accents, a-z0-9 and hyphens, max 80 chars. */
export function slugifyArticleTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ARTICLE_SLUG_MAX)
    .replace(/-+$/g, "")
}

/**
 * First free slug for the site: `base`, `base-2`, `base-3`… (suffix fits within the max length).
 * `excludeId` skips the article being renamed.
 */
export async function uniqueArticleSlug(profileId: string, base: string, excludeId?: string): Promise<string> {
  const root = base || "artigo"
  const taken = await prisma.article.findMany({
    where: { profileId, slug: { startsWith: root }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { slug: true },
  })
  const used = new Set(taken.map((a) => a.slug))
  if (!used.has(root)) return root
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const candidate = `${root.slice(0, ARTICLE_SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`
    if (!used.has(candidate)) {
      if (candidate.startsWith(root)) return candidate
      // Truncated root: the prefix query didn't cover it, so check it directly.
      const clash = await prisma.article.findFirst({
        where: { profileId, slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      if (!clash) return candidate
    }
  }
}

/** Prisma unique-constraint violation (e.g. two writes racing for the same slug). */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002"
}

/** Latest published articles of a site (cards), newest first. */
export function listPublishedArticles(profileId: string, opts: { take?: number } = {}) {
  return prisma.article.findMany({
    where: { profileId, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: PUBLIC_ARTICLE_CARD_SELECT,
    ...(opts.take ? { take: opts.take } : {}),
  })
}

/** A published article by its slug within a site (full content), or null. */
export function findPublishedArticle(profileId: string, slug: string) {
  return prisma.article.findFirst({
    where: { profileId, slug, status: "published" },
    select: {
      ...PUBLIC_ARTICLE_CARD_SELECT,
      content: true,
      metaDescription: true,
      updatedAt: true,
    },
  })
}

export type PublicArticleCard = Awaited<ReturnType<typeof listPublishedArticles>>[number]
export type PublicArticle = NonNullable<Awaited<ReturnType<typeof findPublishedArticle>>>
