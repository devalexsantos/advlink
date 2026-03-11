import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import AnalyticsDashboard from "./AnalyticsDashboard"

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { completed_onboarding: true },
  })

  if (!user || !user.completed_onboarding) {
    redirect("/onboarding/profile")
  }

  return <AnalyticsDashboard />
}
