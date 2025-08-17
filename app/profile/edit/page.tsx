import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"

export default function ProfileEditPage() {
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


