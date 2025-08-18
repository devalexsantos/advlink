import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import MobileTabs from "./tabs"


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
    <div className="h-screen overflow-hidden p-0 md:p-6 rounded-xl">
      {/* Mobile: tabs to switch between Edit and Preview */}
      <div className="md:hidden">
        <MobileTabs />
      </div>

      {/* Desktop: two scrollable columns, no page scroll */}
      <div className="hidden md:grid h-full grid-cols-2 gap-6">
        <div className="h-full min-h-0 overflow-y-auto pr-2">
          <EditProfileForm />
        </div>
        <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
          <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
          <Preview />
        </div>
      </div>
    </div>
  )
}


