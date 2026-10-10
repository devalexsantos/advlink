import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getProfileUrl } from "@/lib/site-url"
import DivulgarClient from "./DivulgarClient"

export const metadata = { title: "Divulgar meu site" }

export default async function DivulgarPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect("/login")

  const profileId = await getActiveSiteId(userId)
  if (!profileId) redirect("/onboarding/new-site")

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: {
      publicName: true,
      slug: true,
      oabNumber: true,
      oabState: true,
      whatsapp: true,
      publicPhone: true,
      publicEmail: true,
      headline: true,
      isActive: true,
      setupComplete: true,
    },
  })

  if (!profile || !profile.setupComplete) redirect("/onboarding/profile")
  if (!profile.slug) redirect("/profile/edit?tab=perfil")

  return (
    <DivulgarClient
      site={{
        name: profile.publicName ?? "",
        url: getProfileUrl(profile.slug),
        oabNumber: profile.oabNumber,
        oabState: profile.oabState,
        phone: profile.whatsapp || profile.publicPhone || null,
        email: profile.publicEmail,
        headline: profile.headline,
        isActive: profile.isActive,
      }}
    />
  )
}
