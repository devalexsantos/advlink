"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AreasCarousel } from "@/app/adv/[slug]/AreasCarousel"
import { Button } from "@/components/ui/button"
import { HeartHandshake, Mail, Phone, Scale, Smartphone, Monitor, Calendar, MapPin, Heart } from "lucide-react"
import whatsAppIcon from "@/assets/icons/whatsapp-icon.svg"
import Link from "next/link"

type Area = { id: string; title: string; description: string | null; coverImageUrl?: string | null }
type Address = { public?: boolean | null; zipCode?: string | null; street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null }
type Profile = {
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
  return res.json() as Promise<{ profile: Profile | null; areas: Area[]; address?: Address }>
}

export default function Preview() {
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop")
  const containerStyle = useMemo(() => ({
    width: mode === "mobile" ? 390 : "100%",
    margin: "0 auto",
    maxWidth: mode === "mobile" ? 390 : "100%",
  }), [mode])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">Carregando pré-visualização…</div>
    )
  }

  const profile = data?.profile
  const areas = data?.areas ?? []
  const address = data?.address
  if (!profile) return null

  const primary = profile.primaryColor || "#8B0000"
  const text = profile.textColor || "#FFFFFF"

  return (
    <div className="w-full overflow-y-scroll h-screen">
      {/* Toggle */}
      <div className="mb-3 hidden md:flex items-center gap-2 p-4">
        <Button type="button" variant={mode === "desktop" ? "default" : "secondary"} className="gap-2 cursor-pointer" onClick={() => setMode("desktop")}>
          <Monitor className="w-4 h-4" /> Desktop
        </Button>
        <Button type="button" variant={mode === "mobile" ? "default" : "secondary"} className="gap-2 cursor-pointer" onClick={() => setMode("mobile")}>
          <Smartphone className="w-4 h-4" /> Mobile
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30" style={containerStyle}>
        <div style={{ color: text, backgroundColor: primary, width: mode === "mobile" ? 390 : "100%" }}>
          {/* Hero */}
          <div className="relative">
            <div className="absolute inset-0" style={{ backgroundColor: primary }} />
            {profile.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.coverUrl as string} alt="Capa" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            )}
            <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
              {/* Avatar */}
              <div className="h-32 w-32 overflow-hidden rounded-full ring-4" style={{ boxShadow: `0 0 0 4px ${text}` }}>
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl as string} alt={profile.publicName || "Avatar"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-zinc-800 text-zinc-300">{(profile.publicName || "").slice(0, 1)}</div>
                )}
              </div>
              {profile.publicName && (
                <h1 className="mt-4 text-2xl font-semibold" style={{ color: text }}>{profile.publicName}</h1>
              )}
              <div className="flex items-center gap-3 mt-4">
                {profile.whatsapp && (
                  <a href={`https://wa.me/${String(profile.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <img src={whatsAppIcon.src} alt="WhatsApp" className="w-10 h-10" />
                  </a>
                )}
                {profile.publicEmail && (
                  <a href={`mailto:${profile.publicEmail}`} className="rounded-full w-10 h-10 flex items-center justify-center" style={{ backgroundColor: primary, color: text }}>
                    <Mail className="w-5 h-5" />
                  </a>
                )}
                {profile.publicPhone && (
                  <a href={`tel:${String(profile.publicPhone).replace(/\D/g, "")}`} className="rounded-full w-10 h-10 flex items-center justify-center" style={{ backgroundColor: primary, color: text }}>
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Áreas */}
          {areas.length > 0 && (
            <div className="w-full px-6 py-10" style={{ backgroundColor: primary }}>
              <h2 className={`mb-6 text-center font-semibold flex items-center justify-center gap-2 ${mode === "mobile" ? "text-2xl" : "text-4xl"}`} style={{ color: text }}>
                <Scale className={mode === "mobile" ? "w-6 h-6" : "w-10 h-10"} /> Serviços
              </h2>
              <div className={mode === "mobile" ? "w-full max-w-[390px] mx-auto" : "w-full mx-auto max-w-6xl"}>
                <div className={mode === "mobile" ? "w-full [&_.min-w-0]:!basis-full [&_.shrink-0]:!basis-full" : ""}>
                  <AreasCarousel areas={areas} primary={primary} text={text} whatsapp={profile.whatsapp || null} publicPhone={profile.publicPhone || null} publicEmail={profile.publicEmail || null} />
                </div>
              </div>
            </div>
          )}

          {/* Sobre */}
          {profile.aboutDescription && (
            <div className="w-full px-6 py-10 mx-auto flex flex-col items-center" style={{ backgroundColor: primary }}>
              <h2 className={`mb-6 text-center font-semibold flex items-center justify-center gap-2 ${mode === "mobile" ? "text-2xl" : "text-4xl"}`} style={{ color: text }}>
                <HeartHandshake className={mode === "mobile" ? "w-6 h-6" : "w-10 h-10"} /> Sobre
              </h2>
              <div className="w-full mx-auto flex flex-col items-center max-w-6xl rounded-xl p-4" style={{ backgroundColor: `${text}14` }}>
                <p className={`w-full text-center text-balance leading-relaxed p-4 ${mode === "mobile" ? "text-sm" : "text-lg"}`} style={{ color: text }} dangerouslySetInnerHTML={{ __html: String(profile.aboutDescription).replace(/\n/g, "<br/>") }} />
              </div>
            </div>
          )}

          {/* Calendly */}
          {profile.calendlyUrl && (
            <div className="w-full px-6 py-10 mx-auto flex flex-col items-center" style={{ backgroundColor: primary }}>
              <Calendar className={mode === "mobile" ? "w-6 h-6" : "w-10 h-10"} />
              <h2 className={`flex items-center gap-2 mb-6 text-center font-semibold ${mode === "mobile" ? "text-2xl" : "text-4xl"}`} style={{ color: text }}>
                Agende uma conversa
              </h2>
              <div className="w-full mx-auto flex flex-col items-center max-w-6xl rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="w-full max-w-6xl" style={{ height: mode === "mobile" ? 600 : 750 }}>
                  <iframe src={profile.calendlyUrl as string} width="100%" height="100%" frameBorder={0} title="Calendly" />
                </div>
              </div>
            </div>
          )}

          {/* Endereço */}
          {address && address.public !== false && (
            <div className="mx-auto max-w-6xl px-6 pb-16 py-10">
              <h2 className={`mb-4 font-semibold text-center flex items-center justify-center gap-2 ${mode === "mobile" ? "text-xl" : "text-2xl"}`} style={{ color: text }}>
                <MapPin className={mode === "mobile" ? "w-6 h-6" : "w-10 h-10"} />
                Endereço
              </h2>
              <div className={`w-full flex items-center justify-center gap-2 ${mode === "mobile" ? "flex-col text-sm" : "flex-col md:flex-row"}`} style={{ color: text }}>
                <span>{[address.street, address.number].filter(Boolean).join(", ")}</span>
                <span>{address.complement}</span>
                <span>{[address.neighborhood, address.city, address.state].filter(Boolean).join(" - ")}</span>
                <span>{address.zipCode}</span>
              </div>
              {(() => {
                const parts = [address.street, address.number, address.neighborhood, address.city, address.state, address.zipCode].filter(Boolean)
                const q = encodeURIComponent(parts.join(", "))
                const src = `https://www.google.com/maps?q=${q}&output=embed`
                return (
                  <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-white/10">
                    <iframe src={src} width="100%" height="100%" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                )
              })()}
            </div>
          )}

          {/* Footer */}
          <div className="w-full px-6 py-4 mx-auto flex flex-col items-center" style={{ backgroundColor: `${text}14` }}>
            <span className={`flex items-center gap-2 ${mode === "mobile" ? "flex-col" : "flex-col md:flex-row"}`} style={{ color: text }}>
              <span>© {new Date().getFullYear()} </span>
              <span>Feito com</span>
              <Heart className="w-4 h-4" />
              <Link href="/" target="_blank" className="font-bold hover:underline">por AdvLink</Link>
              <span>-</span>
              Todos os direitos reservados.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


