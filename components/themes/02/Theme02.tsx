"use client"

import { motion } from "framer-motion"
import { AreasCarousel } from "@/app/adv/[slug]/AreasCarousel"
import { marked } from "marked"
import { Calendar, Heart, HeartHandshake, Mail, MapPin, Phone, Scale } from "lucide-react"
import Link from "next/link"
import whatsAppIcon from "@/assets/icons/whatsapp-icon.svg"

export default function Theme02({ profile, areas, address, primary, text }: any) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ color: text, background: `linear-gradient(135deg, ${primary} 0%, #000 100%)` }}
    >
      {/* background animated grid */}
      <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(white,transparent)] z-0">
        <div className="grid grid-cols-12 gap-2 w-full h-full">
          {Array.from({ length: 120 }).map((_, i) => (
            <div key={i} className="bg-white/10 rounded-sm" />
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="relative z-10">
        {/* cover atrás do avatar e dos botões */}
        {profile.coverUrl && (
          <div className="absolute inset-0 -z-10">
            <motion.img
              src={profile.coverUrl}
              alt="Capa"
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.65, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* overlay para contraste/legibilidade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.6))",
              }}
            />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative flex flex-col items-center text-center px-6 py-20"
        >
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="h-40 w-40 rounded-full overflow-hidden ring-4 shadow-xl"
            style={{ boxShadow: `0 0 20px ${text}80` }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-black/60 text-4xl font-bold">
                {(profile.publicName || "").slice(0, 1)}
              </div>
            )}
          </motion.div>

          {profile.publicName && (
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight">{profile.publicName}</h1>
          )}

          {/* Socials */}
          <div className="flex gap-4 mt-6">
            {profile.whatsapp && (
              <motion.a
                href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <img src={whatsAppIcon.src} alt="WhatsApp" className="w-12 h-12" />
              </motion.a>
            )}

            {profile.publicEmail && (
              <motion.a
                href={`mailto:${profile.publicEmail}`}
                className="rounded-full w-12 h-12 flex items-center justify-center border"
                style={{ backgroundColor: primary, color: text, borderColor: `${text}65` }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <Mail className="w-6 h-6" />
              </motion.a>
            )}

            {profile.publicPhone && (
              <motion.a
                href={`tel:${profile.publicPhone.replace(/\D/g, "")}`}
                className="rounded-full w-12 h-12 flex items-center justify-center border"
                style={{ backgroundColor: primary, color: text, borderColor: `${text}65` }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <Phone className="w-6 h-6" />
              </motion.a>
            )}
          </div>
        </motion.div>
      </section>

      {/* SERVIÇOS */}
      {areas.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-6 py-16 text-center"
        >
          <h2 className="mb-8 text-5xl font-bold flex justify-center items-center gap-3">
            <Scale className="w-10 h-10" /> Serviços
          </h2>
          <AreasCarousel
            areas={areas}
            primary={primary}
            text={text}
            whatsapp={profile.whatsapp}
            publicPhone={profile.publicPhone}
            publicEmail={profile.publicEmail}
          />
        </motion.section>
      )}

      {/* SOBRE */}
      {profile.aboutDescription && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-6 py-16 max-w-5xl mx-auto text-center"
        >
          <h2 className="mb-8 text-5xl font-bold flex justify-center items-center gap-3">
            <HeartHandshake className="w-10 h-10" /> Sobre
          </h2>
          <div className="rounded-2xl p-6 backdrop-blur-md bg-white/10 shadow-lg">
            <div
              className="prose prose-invert text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: marked.parse(profile.aboutDescription || "") as string }}
            />
          </div>
        </motion.section>
      )}

      {/* CALENDLY */}
      {profile.calendlyUrl && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-6 py-16 text-center"
        >
          <h2 className="mb-8 text-5xl font-bold flex justify-center items-center gap-3">
            <Calendar className="w-10 h-10" /> Agende uma conversa
          </h2>
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-lg">
            <iframe src={profile.calendlyUrl} width="100%" height="750" frameBorder="0" />
          </div>
        </motion.section>
      )}

      {/* ENDEREÇO */}
      {address && address.public !== false && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 px-6 py-16 text-center"
        >
          <h2 className="mb-8 text-5xl font-bold flex justify-center items-center gap-3">
            <MapPin className="w-10 h-10" /> Endereço
          </h2>
          <p className="mb-6 text-lg">
            {[address.street, address.number].filter(Boolean).join(", ")} - {address.city}, {address.state}
          </p>
          <div className="aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-xl">
            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                [address.street, address.number, address.city, address.state].join(", "),
              )}&output=embed`}
              width="100%"
              height="100%"
              loading="lazy"
            />
          </div>
        </motion.section>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 px-6 py-6 text-center text-sm bg-black/40 backdrop-blur-md mt-10">
        <span className="flex flex-col md:flex-row justify-center items-center gap-2">
          © {new Date().getFullYear()} - Feito com <Heart className="w-4 h-4" /> por
          <Link href="/" target="_blank" className="font-bold hover:underline">
            {" "}
            AdvLink
          </Link>
        </span>
      </footer>
    </div>
  )
}
