"use client"

import { motion } from "framer-motion"
import { AreasCarousel } from "@/app/adv/[slug]/AreasCarousel"
import { marked } from "marked"
import { Calendar, Heart, HeartHandshake, Mail, MapPin, Phone, Scale, Hammer } from "lucide-react"
import Link from "next/link"
import whatsAppIcon from "@/assets/icons/whatsapp-icon.svg"

type Props = {
  profile: any
  areas: any[]
  address?: any
  primary: string
  text: string
}

export default function Theme03({ profile, areas, address, primary, text }: Props) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ color: text, background: `linear-gradient(135deg, ${primary} 0%, #0a0a0a 100%)` }}
    >
      {/* ====== FUNDO GERAL (continua preenchendo o restante) ====== */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${text}22 1px, transparent 1px),
             linear-gradient(225deg, ${text}17 1px, transparent 1px)`,
          backgroundSize: "28px 28px, 28px 28px",
          backgroundPosition: "0 0, 14px 14px",
        }}
      />
      <div className="absolute inset-6 rounded-[24px] pointer-events-none"
           style={{ boxShadow: `inset 0 0 0 1px ${text}22, inset 0 0 0 8px #00000020, inset 0 0 60px #00000080` }} />
      <motion.div
        className="absolute -top-10 -left-10 opacity-10"
        initial={{ rotate: -6, y: -10 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <Scale className="w-[200px] h-[200px]" />
      </motion.div>
      <motion.div
        className="absolute bottom-10 -right-6 opacity-10"
        initial={{ rotate: 8, y: 0 }}
        animate={{ rotate: 0, y: -10 }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <Hammer className="w-[180px] h-[180px]" />
      </motion.div>

      {/* ====== HERO (header limitado a max-w-6xl) ====== */}
      <section className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 42 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative mx-auto max-w-6xl px-6 pt-16 pb-14 text-center"
        >
          {/* Cover contido na largura do conteúdo */}
          <div className="absolute inset-0 -z-10 rounded-b-3xl overflow-hidden">
            {profile.coverUrl ? (
              <motion.img
                src={profile.coverUrl}
                alt="Capa"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${primary} 0%, #111 100%)` }}
              />
            )}
            {/* overlay para legibilidade */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.7))",
              }}
            />
          </div>

          {/* Faixa de luz suave atrás do avatar/nome */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-10 h-28 w-[92%] rounded-full -z-10"
            style={{
              background: `radial-gradient(ellipse at center, ${text}10 0%, transparent 60%)`,
              filter: "blur(8px)",
            }}
          />

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55 }}
            className="mx-auto h-40 w-40 rounded-full overflow-hidden border"
            style={{
              borderColor: `${text}40`,
              boxShadow: `0 0 0 6px ${text}10, 0 10px 40px rgba(0,0,0,0.4)`,
            }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-black/55 text-4xl font-bold">
                {(profile.publicName || "").slice(0, 1)}
              </div>
            )}
          </motion.div>

          {profile.publicName && (
            <h1 className="mt-5 text-3xl md:text-5xl font-extrabold tracking-tight">
              {profile.publicName}
            </h1>
          )}

          {/* Linha decorativa e ícone */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <i className="block h-px w-16" style={{ background: `${text}40` }} />
            <Scale className="w-6 h-6 opacity-60" />
            <i className="block h-px w-16" style={{ background: `${text}40` }} />
          </div>

          {/* Contatos (ficam sobre o cover, dentro do container max-w-6xl) */}
          <div className="flex gap-4 mt-7 justify-center">
            {profile.whatsapp && (
              <motion.a
                href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full p-2 border"
                style={{ borderColor: `${text}38`, backgroundColor: `${text}08` }}
              >
                <img src={whatsAppIcon.src} alt="WhatsApp" className="w-10 h-10" />
              </motion.a>
            )}
            {profile.publicEmail && (
              <motion.a
                href={`mailto:${profile.publicEmail}`}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full w-12 h-12 flex items-center justify-center border"
                style={{ backgroundColor: `${text}0a`, color: text, borderColor: `${text}38` }}
              >
                <Mail className="w-6 h-6" />
              </motion.a>
            )}
            {profile.publicPhone && (
              <motion.a
                href={`tel:${profile.publicPhone.replace(/\D/g, "")}`}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full w-12 h-12 flex items-center justify-center border"
                style={{ backgroundColor: `${text}0a`, color: text, borderColor: `${text}38` }}
              >
                <Phone className="w-6 h-6" />
              </motion.a>
            )}
          </div>
        </motion.div>
      </section>

      {/* ====== SERVIÇOS ====== */}
      {areas.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-6 py-16 text-center"
        >
          <div
            className="mx-auto mb-8 h-[2px] w-24 rounded"
            style={{ background: `linear-gradient(to right, transparent, ${text}55, transparent)` }}
          />
          <h2 className="mb-8 text-4xl md:text-5xl font-bold flex justify-center items-center gap-3">
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

      {/* ====== SOBRE ====== */}
      {profile.aboutDescription && (
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-6 py-16 max-w-5xl mx-auto text-center"
        >
          <h2 className="mb-6 text-4xl md:text-5xl font-bold flex justify-center items-center gap-3">
            <HeartHandshake className="w-10 h-10" /> Sobre
          </h2>
          <div
            className="rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] border"
            style={{ background: `linear-gradient(180deg, ${text}0f, ${text}08)`, borderColor: `${text}22` }}
          >
            <div
              className="prose prose-invert max-w-none text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: marked.parse(profile.aboutDescription || "") as string }}
            />
          </div>
        </motion.section>
      )}

      {/* ====== CALENDLY ====== */}
      {profile.calendlyUrl && (
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-6 py-16 text-center"
        >
          <h2 className="mb-6 text-4xl md:text-5xl font-bold flex justify-center items-center gap-3">
            <Calendar className="w-10 h-10" /> Agende uma conversa
          </h2>
          <div
            className="max-w-6xl mx-auto rounded-2xl overflow-hidden border shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            style={{ borderColor: `${text}22`, background: `${text}07` }}
          >
            <iframe src={profile.calendlyUrl} width="100%" height="750" frameBorder="0" />
          </div>
        </motion.section>
      )}

      {/* ====== ENDEREÇO ====== */}
      {address && address.public !== false && (
        <motion.section
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-6 pb-16 py-10 text-center"
        >
          <h2 className="mb-4 text-3xl md:text-4xl font-bold flex items-center justify-center gap-2">
            <MapPin className="w-9 h-9" />
            Endereço
          </h2>
          <p className="mb-6 text-lg opacity-90">
            {[address.street, address.number].filter(Boolean).join(", ")} - {address.city}, {address.state}
          </p>
          <div
            className="aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden border shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
            style={{ borderColor: `${text}22` }}
          >
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

      {/* ====== RODAPÉ ====== */}
      <footer
        className="relative z-10 px-6 py-6 text-center text-sm mt-10 border-t"
        style={{ borderColor: `${text}22`, background: `linear-gradient(0deg, #00000060, transparent)` }}
      >
        <span className="flex flex-col md:flex-row justify-center items-center gap-2">
          © {new Date().getFullYear()} — Feito com <Heart className="w-4 h-4" /> por
          <Link href="/" target="_blank" className="font-bold hover:underline">
            &nbsp;AdvLink
          </Link>
        </span>
      </footer>
    </div>
  )
}
