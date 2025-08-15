import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"

export default function ProfileEditPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-start  gap-6 p-6 bg-zinc-950 text-zinc-100">
      <div className="space-y-4 w-full max-w-4xl h-screen overflow-y-scroll">
        <EditProfileForm />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 w-full">
        <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
        <Preview />
      </div>
    </div>
  )
}


