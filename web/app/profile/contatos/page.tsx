import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import ContatosClient from "./ContatosClient"

export const metadata = { title: "Mensagens do site" }

export default async function ContatosPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect("/login")

  const profileId = await getActiveSiteId(userId)
  if (!profileId) redirect("/onboarding/new-site")

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { setupComplete: true },
  })
  if (!profile || !profile.setupComplete) redirect("/onboarding/profile")

  return <ContatosClient />
}
