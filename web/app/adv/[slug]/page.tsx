import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import { Wrench } from "lucide-react"
import { notFound } from "next/navigation"
import { getAppOrigin, getProfileUrl } from "@/lib/site-url"
import { findPublicProfile, loadPublicProfileRelations } from "@/lib/public-profile"
import PublicProfileView from "./PublicProfileView"

type RouteParams = Promise<{ slug: string }>

export default async function PublicProfilePage({ params }: { params: RouteParams }) {
  const { slug } = await params
  const profile = await findPublicProfile({ slug })
  if (!profile) notFound()

  // If the site is not active, show inactive notice (noindex via generateMetadata).
  // Links are absolute: this page is served on <slug>.ROOT_DOMAIN, where /profile/edit doesn't exist.
  if (!profile.isActive) {
    const appUrl = getAppOrigin()
    return (
      <div className="relative isolate overflow-hidden min-h-screen text-zinc-100">
        {/* Geometric background (same style as landing header) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950 to-black" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.56]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 60%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 32%, transparent 55%)",
            filter: "blur(28px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "linear-gradient(transparent 95%, rgba(255,255,255,.08) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.08) 95%)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "conic-gradient(from_45deg,#2b2b2b20,#0000 20%,#2b2b2b20 40%,#0000 60%,#2b2b2b20 80%,#0000)", WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)" }} />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-28">
          <div className="min-h-[50vh] grid place-items-center text-center">
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/60 p-3">
                  <Wrench className="h-6 w-6 text-zinc-300" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-zinc-50 via-zinc-300 to-zinc-400 bg-clip-text text-transparent">
                Esta página está inativa
              </h1>
              <p className="text-zinc-400 text-lg">
                Se você é o administrador, acesse a plataforma da <a href={`${appUrl}/profile/edit`} className="text-zinc-300 underline underline-offset-4 hover:text-white">AdvLink</a>, faça login e publique sua página.
              </p>
              <div>
                <a href={`${appUrl}/login?utm_source=perfil_inativo&utm_medium=referral`} className="text-lg text-zinc-300 underline underline-offset-4 hover:text-white">
                 Acessar AdvLink
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 md:h-40 bg-gradient-to-b from-transparent to-black z-20" />
      </div>
    )
  }

  const relations = await loadPublicProfileRelations(profile.id)
  return (
    <PublicProfileView
      data={{ profile, ...relations }}
      slug={slug}
      showTracker
      gtmContainerId={profile.gtmContainerId}
    />
  )
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { slug } = await params
  const profile = await prisma.profile.findFirst({ where: { slug }, select: { metaTitle: true, metaDescription: true, publicName: true, aboutDescription: true, avatarUrl: true, isActive: true } })
  if (!profile) return { title: "Perfil não encontrado", robots: { index: false, follow: false } }
  const title = profile.metaTitle || profile.publicName || "Advogado"
  const description = profile.metaDescription || stripMarkup(profile.aboutDescription || "").slice(0, 300)
  const image = profile.avatarUrl || undefined
  const url = getProfileUrl(slug)
  return {
    title,
    description,
    metadataBase: new URL(url),
    alternates: { canonical: url },
    robots: profile.isActive ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

// Meta description must be plain text; aboutDescription is rich text (HTML or markdown)
function stripMarkup(text: string) {
  return text.replace(/<[^>]*>/g, " ").replace(/[*_#>`[\]]/g, "").replace(/\s+/g, " ").trim()
}
