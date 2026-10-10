import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { findPublicProfile } from "@/lib/public-profile"
import { getProfileUrl } from "@/lib/site-url"
import { formatArticleDate } from "@/components/themes/ArticlesSection"
import ArticleLayout from "./ArticleLayout"

type RouteParams = Promise<{ slug: string }>

async function loadArticles(profileId: string) {
  return prisma.article.findMany({
    where: { profileId, status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, publishedAt: true },
  })
}

export default async function ArticlesPage({ params }: { params: RouteParams }) {
  const { slug } = await params
  const profile = await findPublicProfile({ slug })
  if (!profile || !profile.isActive) notFound()
  const articles = await loadArticles(profile.id)
  const siteUrl = getProfileUrl(slug)
  const primary = profile.primaryColor || "#8B0000"
  const secondary = profile.secondaryColor || "#FFFFFF"
  const text = profile.textColor || "#FFFFFF"
  const name = profile.publicName?.trim() || "Advogado"

  return (
    <ArticleLayout slug={slug} siteUrl={siteUrl} publicName={name} primary={primary} secondary={secondary} text={text}>
      <h1 className="mb-8 text-3xl font-bold md:text-4xl" style={{ color: secondary }}>Artigos</h1>
      {articles.length === 0 ? (
        <p className="opacity-80">Nenhum artigo publicado até o momento.</p>
      ) : (
        <ul className="space-y-6">
          {articles.map((a) => {
            const date = formatArticleDate(a.publishedAt)
            return (
              <li key={a.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: `${text}33` }}>
                <a href={`${siteUrl}artigos/${a.slug}`} className="block hover:opacity-90">
                  {a.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverImageUrl} alt="" className="h-48 w-full object-cover" loading="lazy" />
                  )}
                  <div className="space-y-2 p-5">
                    {date && <p className="text-xs opacity-70">{date}</p>}
                    <h2 className="text-xl font-semibold" style={{ color: secondary }}>{a.title}</h2>
                    {a.excerpt && <p className="text-sm leading-relaxed opacity-90">{a.excerpt}</p>}
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </ArticleLayout>
  )
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { slug } = await params
  const profile = await findPublicProfile({ slug })
  if (!profile || !profile.isActive) return { title: "Página não encontrada", robots: { index: false, follow: false } }
  const name = profile.publicName?.trim() || "Advogado"
  const url = `${getProfileUrl(slug)}artigos`
  const title = `Artigos | ${name}`
  const description = `Artigos publicados por ${name}.`
  return {
    title,
    description,
    metadataBase: new URL(getProfileUrl(slug)),
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
  }
}
