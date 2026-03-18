import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { getActiveSiteId } from "@/lib/active-site"
import { ProfileLayoutClient } from "./ProfileLayoutClient"

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect("/login")

  const initialSiteId = await getActiveSiteId(userId)

  return (
    <Suspense fallback={null}>
      <ProfileLayoutClient initialSiteId={initialSiteId}>
        {children}
      </ProfileLayoutClient>
    </Suspense>
  )
}
