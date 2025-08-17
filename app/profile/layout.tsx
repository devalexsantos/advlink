import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/">
            <h1 className="text-2xl font-bold">AdvLink</h1>
          </Link>
          <div className="flex items-center gap-2">
            <LogoutButton />
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}