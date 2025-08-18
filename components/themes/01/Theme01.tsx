"use client"

import { AreasCarousel } from "@/app/adv/[slug]/AreasCarousel"
import { marked } from "marked"
import { Calendar, Heart, HeartHandshake, Mail, MapPin, Phone, Scale } from "lucide-react"
import Link from "next/link"
import whatsAppIcon from "@/assets/icons/whatsapp-icon.svg"

type Props = {
  profile: any
  areas: any[]
  address?: any
  primary: string
  text: string
}

export default function Theme01({ profile, areas, address, primary, text }: Props) {

  return (
    <div className="min-h-screen" style={{color: text, backgroundColor: primary }}>
      {/* Hero */}
      <div className="relative">
        {/* capa de fundo */}
        <div className="absolute inset-0" style={{ backgroundColor: primary }} />
        {profile.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="Capa" className="absolute inset-0 h-full w-full object-cover opacity-40 bg-center bg-no-repeat" />
        )}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          {/* Avatar */}
          <div className="h-48 w-48 overflow-hidden rounded-full ring-4" style={{ boxShadow: `0 0 0 4px ${text}` }}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={profile.publicName || "Avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-zinc-800 text-zinc-300 text-4xl font-bold">{(profile.publicName || "").slice(0,1)}</div>
            )}
          </div>
          {profile.publicName && (
            <h1 className="mt-4 text-3xl font-semibold" style={{ color: text }}>{profile.publicName}</h1>
          )}
          <div className="flex items-center gap-3 mt-4">
          {profile.whatsapp && (
            <a 
            href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} 
            target="_blank" 
            rel="noreferrer" 
            >
              <img src={whatsAppIcon.src} alt="WhatsApp" className="w-11 h-11" />
            </a>
          )}
          {profile.publicEmail && (
            <a href={`mailto:${profile.publicEmail}`} className="rounded-full w-12 h-12 flex items-center justify-center" 
            style={{ backgroundColor: primary, color: text, border: "2px solid", borderColor: `${text}65` }}>
              <Mail className="w-6 h-6" />
            </a>
          )}
          {profile.publicPhone && (
            <a href={`tel:${profile.publicPhone.replace(/\D/g, "")}`} className="rounded-full w-12 h-12 flex items-center justify-center"
            style={{ backgroundColor: primary, color: text, border: "2px solid", borderColor: `${text}65` }}>
              <Phone className="w-6 h-6" />
            </a>
          )}
          </div>
        </div>
      </div>

      {/* Áreas de atuação - carrossel */}
      {areas.length > 0 && (
        <div className="w-full px-6 py-10" style={{ backgroundColor: primary }}>
          <h2 className="mb-6 text-4xl text-center font-semibold flex items-center justify-center gap-2" style={{ color: text }}>
            <Scale className="w-10 h-10" />
            Serviços
            </h2>
          <AreasCarousel areas={areas} primary={primary} text={text} whatsapp={profile.whatsapp} publicPhone={profile.publicPhone} publicEmail={profile.publicEmail} />
        </div>
      )}
          {profile.aboutDescription && (
        <div className="w-full px-6 py-10 mx-auto flex flex-col items-center" style={{ backgroundColor: primary }}>
          <h2 className="mb-6 text-4xl text-center font-semibold flex items-center justify-center gap-2" style={{ color: text }}>
            <HeartHandshake className="w-10 h-10" />
            Sobre
            </h2>
            <div className="w-full mx-auto flex flex-col items-center max-w-6xl rounded-xl p-4" style={{ backgroundColor: `${text}14` }}>
              <div
                className="w-full prose prose-invert max-w-none text-lg leading-relaxed p-4"
                style={{ color: text }}
                dangerouslySetInnerHTML={{ __html: marked.parse(profile.aboutDescription || "") as string }}
              />
            </div>
          </div>
          )}
      {profile.calendlyUrl && (
        <div className="w-full px-6 py-10 mx-auto flex flex-col items-center" style={{ backgroundColor: primary }}>
            <Calendar className="w-10 h-10" />
          <h2 className="flex items-center gap-2 mb-6 text-4xl text-center font-semibold" style={{ color: text }}>
            Agende uma conversa
            </h2>
          <div className="w-full mx-auto flex flex-col items-center max-w-6xl rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="w-full max-w-6xl" style={{ height: 750 }}>
              <iframe
                src={profile.calendlyUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Calendly"
              />
            </div>
          </div>
        </div>
      )}

      {address && address.public !== false && (
        <div className="mx-auto max-w-6xl px-6 pb-16 py-10">
          <h2 className="mb-4 text-2xl font-semibold text-center flex items-center justify-center gap-2" style={{ color: text }}>
            <MapPin className="w-10 h-10" />
            Endereço
            </h2>
          <div className="w-full flex flex-col md:flex-row items-center justify-center gap-2" style={{ color: text }}>
            <span>{[address.street, address.number].filter(Boolean).join(", ")}</span>
            <span>{address.complement}</span>
            <span>{[address.neighborhood, address.city, address.state].filter(Boolean).join(" - ")}</span>
            <span>{address.zipCode}</span>
          </div>
          {/* Google Maps Embed */}
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
      <div className="w-full px-6 py-4 mx-auto flex flex-col items-center" style={{ backgroundColor: `${text}14` }}>
      <span className="flex flex-col md:flex-row items-center gap-2" style={{ color: text }}>
        <span>© {new Date().getFullYear()} </span>
        <span>Feito com</span>
        <Heart className="w-4 h-4" />
        <Link href="/" target="_blank" className="font-bold hover:underline">por AdvLink</Link>
        <span>-</span>
        Todos os direitos reservados.
      </span>
      </div>
    </div>
  )
}