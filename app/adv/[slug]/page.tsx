import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Theme03 from "@/components/themes/03/Theme03"
import Theme02 from "@/components/themes/02/Theme02"
import Theme01 from "@/components/themes/01/Theme01"

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

  const areas = await prisma.activityAreas.findMany({
    where: { userId: profile.userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
  const address = profile.user.Address?.[0]

  const primary = profile.primaryColor || "#8B0000"
  const text = profile.textColor || "#FFFFFF"

  return (
    <Theme02  
    profile={profile} 
    areas={areas} 
    address={address} 
    primary={primary} 
    text={text} 
  />
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

