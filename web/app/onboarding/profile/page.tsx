import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProfileForm } from "./_componentes/ProfileForm/ProfileForm";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import { getActiveSiteId } from "@/lib/active-site";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function Profile() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  // Check if active site already has setup complete
  const profileId = await getActiveSiteId(userId)
  if (profileId) {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { setupComplete: true },
    })
    if (profile?.setupComplete) {
      redirect("/profile/edit")
    }
  } else {
    // No site at all — redirect to create one
    redirect("/onboarding/new-site")
  }

  // Check if user has other completed sites (additional site flow)
  const completedSites = await prisma.profile.count({
    where: { userId, setupComplete: true },
  })
  const isAdditionalSite = completedSites > 0

  return (
      <div className="flex flex-col gap-8 items-center justify-center w-full h-full min-h-screen bg-background text-foreground p-6">
        <div className="flex flex-col gap-4 items-center justify-center max-w-2xl">
        <h1 className="text-4xl font-bold text-center">
          {isAdditionalSite ? "Configure seu novo site" : "Vamos começar?"}
        </h1>
        <p className="text-xl text-muted-foreground text-center">
          Preencha sobre você ou seu escritório. Fique tranquilo, você pode editar essas informações depois.
        </p>
        </div>
        <ProfileForm />
        <div className="flex items-center gap-4">
          {isAdditionalSite && (
            <Link
              href="/profile/edit"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Voltar ao dashboard
            </Link>
          )}
          <LogoutButton variant="ghost" size="sm" className="inline-flex items-center gap-2 cursor-pointer">
            Sair
          </LogoutButton>
        </div>
      </div>
  )
}
