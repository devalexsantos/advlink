import type { ReactNode } from "react"
import { ProfileTracker } from "@/components/analytics/ProfileTracker"

type Props = {
  slug: string
  siteUrl: string
  publicName: string
  primary: string
  secondary: string
  text: string
  children: ReactNode
}

/** Shared frame of the public article pages, using the site's own colors. */
export default function ArticleLayout({ slug, siteUrl, publicName, primary, secondary, text, children }: Props) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: primary, color: text }}>
      <ProfileTracker slug={slug} />
      <header className="mx-auto max-w-3xl px-6 pt-12">
        <a
          href={siteUrl}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:opacity-80"
          style={{ borderColor: `${text}44`, color: secondary }}
        >
          <span aria-hidden>←</span> Voltar ao site
        </a>
        <p className="mt-6 text-sm opacity-80">{publicName}</p>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-6">{children}</main>
      <footer className="mx-auto max-w-3xl border-t px-6 py-8 text-center text-xs opacity-80" style={{ borderColor: `${text}33` }}>
        <a href={`${siteUrl}privacidade`} className="underline underline-offset-4">Privacidade</a>
      </footer>
    </div>
  )
}

export const articleBodyClass =
  "text-base leading-relaxed [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
