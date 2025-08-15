import { ProfileForm } from "./_componentes/ProfileForm/ProfileForm";

export default function Profile() {
  return (
      <div className="flex flex-col gap-8 items-center justify-center w-full h-full min-h-screen bg-zinc-900 text-white p-6">
        <div className="flex flex-col gap-4 items-center justify-center max-w-2xl">
        <h1 className="text-4xl font-bold text-center">Quem é você?</h1>
        <p className="text-2xl text-zinc-300 text-center">
          Fique tranquilo, você pode editar essas informações depois.
        </p>
        </div>
        <ProfileForm />
      </div>
  )
}