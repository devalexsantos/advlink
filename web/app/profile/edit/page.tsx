import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import EditDashboard from "./EditDashboard"

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  // Check if user has any profiles
  const profileCount = await prisma.profile.count({ where: { userId } })
  if (profileCount === 0) {
    redirect("/onboarding/new-site")
  }

  // Resolve active site
  const profileId = await getActiveSiteId(userId)
  if (!profileId) {
    redirect("/onboarding/new-site")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { setupComplete: true, isActive: true, slug: true },
  })

  if (!profile || !profile.setupComplete) {
    redirect("/onboarding/profile")
  }

  return <EditDashboard isActive={!!profile.isActive} slug={profile.slug ?? undefined} />
}
