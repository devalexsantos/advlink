import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getActiveSiteId } from "@/lib/active-site"
import DominioClient from "./DominioClient"

export const metadata = { title: "Domínio próprio" }

export default async function DominioPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) redirect("/login")

  const profileId = await getActiveSiteId(userId)
  if (!profileId) redirect("/onboarding/new-site")

  return <DominioClient />
}
