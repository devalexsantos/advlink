import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import EditDashboard from "./EditDashboard"

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { completed_onboarding: true, isActive: true, profile: { select: { slug: true } } },
  })

  if (!user || user.completed_onboarding === false) {
    redirect("/onboarding/profile")
  }

  return <EditDashboard isActive={!!user?.isActive} slug={user?.profile?.slug ?? undefined} />
}
