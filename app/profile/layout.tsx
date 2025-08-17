import ProfileHeader from "./ProfileHeader"

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      <ProfileHeader />
      <main className="mx-auto w-full flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}