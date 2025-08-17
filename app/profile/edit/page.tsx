import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { completed_onboarding: true },
  })

  if (!user || user.completed_onboarding === false) {
    redirect("/onboarding/profile")
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="space-y-4 w-full h-screen overflow-y-scroll">
        <EditProfileForm />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 w-full">
        <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
        <Preview />
      </div>
    </div>
  )
}


