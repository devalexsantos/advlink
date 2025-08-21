import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Theme03 from "@/components/themes/03/Theme03"
import Theme02 from "@/components/themes/02/Theme02"
import Link from "next/link"
import { Wrench } from "lucide-react"

type RouteParams = Promise<{ slug: string }>

export default async function PublicProfilePage({ params }: { params: RouteParams }) {
  const { slug } = await params
  const profile = await prisma.profile.findFirst({
    where: { slug },
    include: { user: { include: { Address: true } } },
  })
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-black text-white">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Perfil não encontrado</h1>
          <p className="text-zinc-400">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  // If the owner's account is not active, show inactive notice instead of the page
  if (!profile.user?.isActive) {
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
                Se você é o administrador, acesse a plataforma da <Link href="/profile/edit" className="text-zinc-300 underline underline-offset-4 hover:text-white">AdvLink</Link>, faça login e publique sua página.
              </p>
              <div>
                <Link href="/profile/edit" className="text-lg text-zinc-300 underline underline-offset-4 hover:text-white">
                 Acessar AdvLink
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 md:h-40 bg-gradient-to-b from-transparent to-black z-20" />
      </div>
    )
  }

  const areas = await prisma.activityAreas.findMany({
    where: { userId: profile.userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
  const links = await prisma.links.findMany({
    where: { userId: profile.userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
  const gallery = await prisma.gallery.findMany({
    where: { userId: profile.userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
  const address = profile.user.Address?.[0]

  const primary = profile.primaryColor || "#8B0000"
  const text = profile.textColor || "#FFFFFF"
  const secondary = profile.secondaryColor || "#FFFFFF"
  const theme = profile.theme
  return (
    <div>
      {theme === "modern" && (
        <Theme02  
          profile={profile} 
          areas={areas} 
          address={address} 
          links={links}
          gallery={gallery}
          primary={primary} 
          text={text} 
          secondary={secondary}
        />
      )}
      {theme === "classic" && (
        <Theme03  
        profile={profile} 
        areas={areas} 
        address={address} 
        links={links}
        gallery={gallery}
        primary={primary} 
        text={text} 
        secondary={secondary}
      />
      )}
    </div>
  )
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { slug } = await params
  const profile = await prisma.profile.findFirst({ where: { slug }, select: { metaTitle: true, metaDescription: true, publicName: true, aboutDescription: true, avatarUrl: true } })
  const title = profile?.metaTitle || profile?.publicName || "Advogado"
  const description = profile?.metaDescription || profile?.aboutDescription || ""
  const image = profile?.avatarUrl || undefined
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/adv/${slug}`,
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

