"use client"

import { useQuery } from "@tanstack/react-query"
import Preview02 from "./Preview02"
import Preview03 from "./Preview03"

type Area = { id: string; title: string; description: string | null; coverImageUrl?: string | null }
type LinkItem = { id: string; title: string; description: string | null; url: string; coverImageUrl?: string | null }
type Address = { public?: boolean | null; zipCode?: string | null; street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null }
type Profile = {
  theme?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  textColor?: string | null
  coverUrl?: string | null
  publicName?: string | null
  avatarUrl?: string | null
  whatsapp?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  calendlyUrl?: string | null
  aboutDescription?: string | null
}

async function fetchProfile() {
  const res = await fetch("/api/profile", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar preview")
  return res.json() as Promise<{ profile: Profile | null; areas: Area[]; address?: Address; links: LinkItem[] }>
}

export default function Preview() {
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">Carregando pré-visualização…</div>
    )
  }

  const profile = data?.profile
  const areas = data?.areas ?? []
  const address = data?.address
  const links = (data as unknown as { links?: LinkItem[] })?.links ?? []
  if (!profile) return null

  const theme = profile.theme || "modern"
  if (theme === "classic") {
    return <Preview03 profile={profile} areas={areas} address={address} links={links} />
  }
  return <Preview02 profile={profile} areas={areas} address={address} links={links} />
}


