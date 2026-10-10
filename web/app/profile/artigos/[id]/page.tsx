import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getProfileUrl } from "@/lib/site-url"
import ArticleEditor from "./ArticleEditor"

export const metadata = { title: "Editar artigo" }

export default async function ArtigoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect("/login")

  const profileId = await getActiveSiteId(userId)
  if (!profileId) redirect("/onboarding/new-site")

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { slug: true, setupComplete: true },
  })
  if (!profile || !profile.setupComplete) redirect("/onboarding/profile")
  if (!profile.slug) redirect("/profile/edit?tab=perfil")

  return <ArticleEditor id={id} siteUrl={getProfileUrl(profile.slug)} />
}
