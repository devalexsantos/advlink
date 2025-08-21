import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProfileForm } from "./_componentes/ProfileForm/ProfileForm";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Profile() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { completed_onboarding: true },
  })

  if (user && user.completed_onboarding === true) {
    redirect("/profile/edit")
  }
  return (
      <div className="flex flex-col gap-8 items-center justify-center w-full h-full min-h-screen bg-zinc-900 text-white p-6">
        <div className="flex flex-col gap-4 items-center justify-center max-w-2xl">
        <h1 className="text-4xl font-bold text-center">Vamos começar?</h1>
        <p className="text-xl text-zinc-300 text-center">
          Preencha sobre você ou seu escritório. Fique tranquilo, você pode editar essas informações depois.
        </p>
        </div>
        <ProfileForm />
        <div>
          <LogoutButton variant="ghost" size="sm" className="inline-flex items-center gap-2 cursor-pointer">
            Sair
          </LogoutButton>
        </div>
      </div>
  )
}