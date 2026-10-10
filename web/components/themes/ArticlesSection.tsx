import type { CSSProperties } from "react"

export type ArticleSummary = {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  publishedAt?: Date | string | null
}

type Props = {
  articles?: ArticleSummary[] | null
  /** Absolute site URL ending with "/". Without it (previews) the links are disabled. */
  baseUrl?: string
  text: string
  borderColor: string
  headingColor?: string
  className?: string
  cardClassName?: string
  cardStyle?: CSSProperties
  titleClassName?: string
}

export function formatArticleDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })
}

export function hasArticles(articles?: ArticleSummary[] | null): boolean {
  return (articles?.length ?? 0) > 0
}

/** Up to 3 latest articles with a link to the full list. Renders nothing without articles. */
export default function ArticlesSection({
  articles,
  baseUrl,
  text,
  borderColor,
  headingColor,
  className = "",
  cardClassName = "rounded-2xl border",
  cardStyle,
  titleClassName = "",
}: Props) {
  const items = (articles ?? []).slice(0, 3)
  if (items.length === 0) return null
  const linkable = typeof baseUrl === "string" && baseUrl.startsWith("http")

  return (
    <div className={`mx-auto w-full max-w-5xl text-left ${className}`} style={{ color: text }}>
      <ul className="grid gap-6 md:grid-cols-3">
        {items.map((a) => {
          const date = formatArticleDate(a.publishedAt)
          const body = (
            <>
              {a.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.coverImageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
              )}
              <div className="space-y-2 p-4">
                {date && <p className="text-xs opacity-70">{date}</p>}
                <h3 className={`text-lg font-semibold leading-snug ${titleClassName}`} style={{ color: headingColor ?? text }}>
                  {a.title}
                </h3>
                {a.excerpt && <p className="line-clamp-3 text-sm leading-relaxed opacity-90">{a.excerpt}</p>}
              </div>
            </>
          )
          return (
            <li key={a.id} className={`overflow-hidden ${cardClassName}`} style={{ borderColor, ...cardStyle }}>
              {linkable ? (
                <a href={`${baseUrl}artigos/${a.slug}`} className="block h-full hover:opacity-90">
                  {body}
                </a>
              ) : (
                <div className="h-full">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
      {linkable && (
        <p className="mt-6 text-center">
          <a href={`${baseUrl}artigos`} className="text-sm font-medium underline underline-offset-4 hover:opacity-80" style={{ color: headingColor ?? text }}>
            Ver todos os artigos
          </a>
        </p>
      )}
    </div>
  )
}
