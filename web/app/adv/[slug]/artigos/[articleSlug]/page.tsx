import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { findPublicProfile, publicSiteUrl } from "@/lib/public-profile"
import { formatOab } from "@/lib/oab"
import { renderContent } from "@/lib/render-content"
import { jsonLdScript } from "@/lib/profile-jsonld"
import { formatArticleDate } from "@/components/themes/ArticlesSection"
import ArticleLayout, { articleBodyClass } from "../ArticleLayout"

type RouteParams = Promise<{ slug: string; articleSlug: string }>

async function loadArticle(profileId: string, articleSlug: string) {
  return prisma.article.findFirst({ where: { profileId, slug: articleSlug, status: "published" } })
}

export default async function ArticlePage({ params }: { params: RouteParams }) {
  const { slug, articleSlug } = await params
  const profile = await findPublicProfile({ slug })
  if (!profile || !profile.isActive) notFound()
  const article = await loadArticle(profile.id, articleSlug)
  if (!article) notFound()

  const siteUrl = publicSiteUrl(profile, slug)
  const name = profile.publicName?.trim() || "Advogado"
  const oab = formatOab(profile.oabNumber, profile.oabState)
  const primary = profile.primaryColor || "#8B0000"
  const secondary = profile.secondaryColor || "#FFFFFF"
  const text = profile.textColor || "#FFFFFF"
  const date = formatArticleDate(article.publishedAt)
  const url = `${siteUrl}artigos/${article.slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: new Date(article.updatedAt).toISOString(),
    author: { "@type": "Person", name },
    publisher: { "@type": "Person", name, url: siteUrl },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: article.coverImageUrl || undefined,
    description: article.metaDescription || article.excerpt || undefined,
  }

  return (
    <ArticleLayout slug={slug} siteUrl={siteUrl} publicName={name} primary={primary} secondary={secondary} text={text}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <article>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ color: secondary }}>{article.title}</h1>
        <p className="mt-3 text-sm opacity-80">
          {date}
          {date ? " · " : ""}
          Por {name}
          {oab ? ` — ${oab}` : ""}
        </p>
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverImageUrl} alt="" className="mt-6 max-h-96 w-full rounded-2xl object-cover" />
        )}
        <div className={`mt-8 ${articleBodyClass}`} dangerouslySetInnerHTML={{ __html: renderContent(article.content) }} />
      </article>
    </ArticleLayout>
  )
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { slug, articleSlug } = await params
  const profile = await findPublicProfile({ slug })
  if (!profile || !profile.isActive) return { title: "Página não encontrada", robots: { index: false, follow: false } }
  const article = await loadArticle(profile.id, articleSlug)
  if (!article) return { title: "Artigo não encontrado", robots: { index: false, follow: false } }
  const name = profile.publicName?.trim() || "Advogado"
  const title = `${article.title} | ${name}`
  const description = article.metaDescription || article.excerpt || undefined
  const url = `${publicSiteUrl(profile, slug)}artigos/${article.slug}`
  return {
    title,
    description,
    metadataBase: new URL(publicSiteUrl(profile, slug)),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  }
}
