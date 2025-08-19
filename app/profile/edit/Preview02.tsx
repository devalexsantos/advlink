"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, Monitor } from "lucide-react"
import Theme02 from "@/components/themes/02/Theme02"

type Area = { id: string; title: string; description: string | null; coverImageUrl?: string | null }
type LinkItem = { id: string; title: string; description: string | null; url: string; coverImageUrl?: string | null }
type Address = { public?: boolean | null; zipCode?: string | null; street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null }
type Profile = {
  primaryColor?: string | null
  textColor?: string | null
}

type Props = {
  profile: Profile
  areas: Area[]
  address?: Address
  links?: LinkItem[]
}

export default function Preview02({ profile, areas, address, links = [] }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop")
  const containerStyle = useMemo(
    () => ({
      width: mode === "mobile" ? 390 : "100%",
      margin: "0 auto",
      maxWidth: mode === "mobile" ? 390 : "100%",
    }),
    [mode]
  )

  const primary = profile.primaryColor || "#8B0000"
  const text = profile.textColor || "#FFFFFF"

  return (
    <div className="w-full overflow-y-scroll h-screen">
      <div className="mb-3 hidden md:flex items-center gap-2 p-4">
        <Button type="button" variant={mode === "desktop" ? "default" : "secondary"} className="gap-2 cursor-pointer" onClick={() => setMode("desktop")}>
          <Monitor className="w-4 h-4" /> Desktop
        </Button>
        <Button type="button" variant={mode === "mobile" ? "default" : "secondary"} className="gap-2 cursor-pointer" onClick={() => setMode("mobile")}>
          <Smartphone className="w-4 h-4" /> Mobile
        </Button>
      </div>

      <div className={`rounded-xl border border-zinc-800 bg-zinc-900/30 ${mode === "mobile" ? "[&_.min-w-0]:!basis-full [&_.shrink-0]:!basis-full" : ""}`} style={containerStyle}>
        <Theme02 profile={profile} areas={areas} address={address} links={links} primary={primary} text={text} />
      </div>
    </div>
  )
}


