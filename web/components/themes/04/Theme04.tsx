"use client"

import { motion } from "framer-motion"
import { AreasCarousel } from "@/app/adv/[slug]/AreasCarousel"
import { GalleryCarousel } from "@/app/adv/[slug]/GalleryCarousel"
import { TeamCarousel } from "@/app/adv/[slug]/TeamCarousel"
import { renderContent } from "@/lib/render-content"
import { formatOab } from "@/lib/oab"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import FaqSection, { hasFaqs } from "@/components/themes/FaqSection"
import ArticlesSection, { hasArticles, type ArticleSummary } from "@/components/themes/ArticlesSection"
import LeadFormSection from "@/components/themes/LeadFormSection"
import { buildServiceLine, buildFirmLine } from "@/components/themes/profile-info"
import { Facebook, Heart, Instagram, Linkedin, Mail, Phone, SquareArrowOutUpRight, Youtube } from "lucide-react"
import Link from "next/link"
import { Fragment } from "react"
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"
import { getSectionOrder, getSectionLabel, getSectionIcon, type SectionKey, type SectionLabels } from "@/lib/section-order"
import { getIconComponent } from "@/lib/icon-renderer"
import CustomSectionRenderer from "@/components/themes/CustomSectionRenderer"

type Area = { id: string; title: string; description: string | null; coverImageUrl?: string | null; faqs?: { id: string; question: string; answer: string; position?: number }[] }
type LinkItem = { id: string; title: string; description: string | null; url: string; coverImageUrl?: string | null }
type GalleryItem = { id: string; coverImageUrl?: string | null }
type Address = { public?: boolean | null; street?: string | null; number?: string | null; city?: string | null; state?: string | null }
type CustomSection = { id: string; title: string; description: string | null; imageUrl: string | null; layout: string; iconName: string; videoUrl?: string | null; buttonConfig?: { url: string; label: string; bgColor: string; textColor: string; borderRadius: number; iconName?: string } | null }
type TeamMember = { id: string; name: string; description: string | null; avatarUrl: string | null; phone: string | null; whatsapp: string | null; email: string | null }
type Profile = { leadFormEnabled?: boolean | null; publicName?: string | null; headline?: string | null; oabNumber?: string | null; oabState?: string | null; coverUrl?: string | null; avatarUrl?: string | null; whatsapp?: string | null; publicEmail?: string | null; publicPhone?: string | null; aboutDescription?: string | null; calendlyUrl?: string | null; instagramUrl?: string | null; linkedinUrl?: string | null; facebookUrl?: string | null; youtubeUrl?: string | null; whatsappMessage?: string | null; firmName?: string | null; firmType?: string | null; firmOabRegistration?: string | null; firmCnpj?: string | null; officeHours?: string | null; languages?: string | null; onlineService?: boolean | null; whatsappIsFixed?: boolean | null; publicPhoneIsFixed?: boolean | null }

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } }
const fadeInView = { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.6 } }

export default function Theme04({ profile, areas, address, links = [], gallery = [], primary, text, secondary, constrainToContainer = false, forceMobile = false, sectionOrder, sectionLabels, customSections = [], sectionIcons, sectionTitleHidden, teamMembers = [], privacyUrl, articles, siteBaseUrl, leadFormDisabled = false, slug }: { profile: Profile; areas: Area[]; address?: Address; links?: LinkItem[]; gallery?: GalleryItem[]; primary: string; text: string; secondary: string; constrainToContainer?: boolean; forceMobile?: boolean; sectionOrder?: string[]; sectionLabels?: Record<string, string>; customSections?: CustomSection[]; sectionIcons?: Record<string, string>; sectionTitleHidden?: Record<string, boolean>; teamMembers?: TeamMember[]; privacyUrl?: string; articles?: ArticleSummary[]; siteBaseUrl?: string; leadFormDisabled?: boolean; slug?: string }) {
  const order = getSectionOrder(sectionOrder as SectionKey[] | undefined)
  const label = (key: SectionKey) => getSectionLabel(key, sectionLabels as SectionLabels)
  const icon = (key: SectionKey) => getIconComponent(getSectionIcon(key, sectionIcons))
  const hidden = (key: SectionKey) => sectionTitleHidden?.[key] === true
  const serviceLine = buildServiceLine(profile)
  const firmLine = buildFirmLine(profile)

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    servicos: () => areas.length > 0 ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("servicos") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("servicos"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("servicos")}
          </h2>
        )}
        <AreasCarousel
          areas={areas}
          primary={primary}
          text={text}
          secondary={secondary}
          whatsapp={profile.whatsapp}
          whatsappMessage={profile.whatsappMessage}
          publicPhone={profile.publicPhone}
          publicEmail={profile.publicEmail}
        />
        <div className="mt-14 mx-auto max-w-6xl border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    faq: () => hasFaqs(areas) ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("faq") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("faq"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("faq")}
          </h2>
        )}
        <FaqSection areas={areas} text={text} borderColor={`${text}20`} headingColor={secondary} itemClassName="rounded-none border-2 bg-white/5" />
      </motion.section>
    ) : null,

    artigos: () => hasArticles(articles) ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("artigos") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("artigos"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("artigos")}
          </h2>
        )}
        <ArticlesSection articles={articles} baseUrl={siteBaseUrl} text={text} borderColor={`${text}20`} headingColor={secondary} cardClassName="rounded-none border-2 bg-white/5" />
      </motion.section>
    ) : null,

    contato: () => profile.leadFormEnabled ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("contato") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("contato"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("contato")}
          </h2>
        )}
        <LeadFormSection slug={slug ?? ""} areas={areas.map((a) => a.title)} privacyUrl={privacyUrl} text={text} borderColor={`${text}33`} buttonBg={secondary} buttonText={primary} disabled={leadFormDisabled} fieldClassName="rounded-none border-2 bg-white/5" />
      </motion.section>
    ) : null,

    sobre: () => profile.aboutDescription ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 max-w-5xl mx-auto text-center">
        {!hidden("sobre") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("sobre"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("sobre")}
          </h2>
        )}
        <div className="rounded-none p-6 border-2 bg-white/5" style={{ borderColor: `${text}20` }}>
          <div
            className="prose prose-invert text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderContent(profile.aboutDescription) }}
          />
        </div>
        <div className="mt-14 border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    galeria: () => Array.isArray(gallery) && gallery.length > 0 ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("galeria") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("galeria"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("galeria")}
          </h2>
        )}
        <GalleryCarousel items={gallery} text={text} secondary={secondary} />
        <div className="mt-14 mx-auto max-w-6xl border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    links: () => Array.isArray(links) && links.length > 0 ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 max-w-6xl mx-auto">
        {!hidden("links") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold text-center flex items-center justify-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("links"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("links")}
          </h2>
        )}
        <div className={`grid ${forceMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"} gap-6`}>
          {links.map((l: LinkItem, idx: number) => (
            <motion.div
              key={l.id || idx}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
              className="rounded-none overflow-hidden border-2 bg-white/5 flex flex-col"
              style={{ color: text, borderColor: `${text}20` }}
            >
              {l.coverImageUrl && (
                <div className="aspect-video w-full bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.coverImageUrl} alt={l.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-xl font-semibold mb-2 line-clamp-2">{l.title}</h3>
                {l.description && (
                  <div className="opacity-75 text-sm mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: renderContent(l.description) }} />
                )}
                <div className="mt-auto">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-none px-4 py-2 font-medium border-2 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                  >
                    Visualizar
                    <SquareArrowOutUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-14 border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    calendly: () => profile.calendlyUrl ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("calendly") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("calendly"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("calendly")}
          </h2>
        )}
        <div className="max-w-6xl mx-auto rounded-none overflow-hidden border-2" style={{ borderColor: `${text}20` }}>
          <iframe src={profile.calendlyUrl} width="100%" height="750" frameBorder="0" />
        </div>
        <div className="mt-14 mx-auto max-w-6xl border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    equipe: () => teamMembers.length > 0 ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("equipe") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("equipe"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("equipe")}
          </h2>
        )}
        <TeamCarousel members={teamMembers} primary={primary} text={text} secondary={secondary} />
        <div className="mt-14 mx-auto max-w-6xl border-t" style={{ borderColor: `${text}25` }} />
      </motion.section>
    ) : null,

    endereco: () => address && address.public !== false ? (
      <motion.section {...fadeInView} className="relative z-10 px-6 py-14 text-center">
        {!hidden("endereco") && (
          <h2 className="mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3" style={{ color: secondary }}>
            {(() => { const I = icon("endereco"); return I ? <I className="w-8 h-8" style={{ color: secondary }} /> : null })()} {label("endereco")}
          </h2>
        )}
        <p className="mb-6 text-lg">
          {[address.street, address.number].filter(Boolean).join(", ")} - {address.city}, {address.state}
        </p>
        <div className="aspect-video w-full max-w-4xl mx-auto rounded-none overflow-hidden border-2" style={{ borderColor: `${text}20` }}>
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
    ) : null,
  }

  // Add custom section renderers
  for (const cs of customSections) {
    const key = `custom_${cs.id}` as SectionKey
    sectionRenderers[key] = () => (
      <CustomSectionRenderer
        section={cs}
        label={(sectionLabels as SectionLabels)?.[key] || cs.title}
        iconName={cs.iconName}
        primary={primary}
        text={text}
        secondary={secondary}
        themeVariant="corporate"
        forceMobile={forceMobile}
        hideTitle={hidden(key)}
      />
    )
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans"
      style={{ color: text, background: `linear-gradient(180deg, ${primary} 0%, ${primary}ee 100%)` }}
    >
      {/* Subtle dot grid texture */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(${text} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* HERO — horizontal layout */}
      <section className="relative z-10">
        {profile.coverUrl && (
          <div className="absolute inset-0 -z-10">
            <motion.img
              src={profile.coverUrl}
              alt="Capa"
              className="absolute inset-0 h-full w-full object-cover"
              {...fade}
              animate={{ opacity: 0.55 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.65))",
              }}
            />
          </div>
        )}

        <motion.div
          {...fade}
          className={`relative flex flex-col items-center text-center ${forceMobile ? "gap-6 px-6 py-16" : "md:flex-row md:items-start md:text-left gap-6 md:gap-10 px-6 md:px-12 py-16 md:py-20"} max-w-6xl mx-auto`}
        >
          {/* Avatar */}
          <motion.div
            {...fade}
            className={`h-36 w-36 ${forceMobile ? "" : "md:h-44 md:w-44"} shrink-0 overflow-hidden rounded-none border-2 shadow-xl`}
            style={{ borderColor: `${text}40` }}
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

          {/* Name + headline + contacts */}
          <div className={`flex flex-col items-center ${forceMobile ? "" : "md:items-start"} gap-3`}>
            {profile.publicName && (
              <h1 className={`text-3xl ${forceMobile ? "" : "md:text-5xl"} font-bold tracking-tight`} style={{ color: text }}>{profile.publicName}</h1>
            )}
            {profile.headline && (
              <p className={`text-lg ${forceMobile ? "" : "md:text-xl"} opacity-85`}>{profile.headline}</p>
            )}
            {formatOab(profile.oabNumber, profile.oabState) && (
              <p className="text-sm tracking-wide opacity-70">{formatOab(profile.oabNumber, profile.oabState)}</p>
            )}

            {/* Contact buttons — square with border */}
            <div className="flex flex-wrap gap-3 mt-3">
              {profile.whatsapp && (
                <a
                  href={buildWhatsAppUrl(profile.whatsapp, profile.whatsappMessage)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              )}
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {profile.facebookUrl && (
                <a
                  href={profile.facebookUrl}
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {profile.youtubeUrl && (
                <a
                  href={profile.youtubeUrl}
                  aria-label="YouTube"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {profile.publicEmail && (
                <a
                  href={`mailto:${profile.publicEmail}`}
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
              {profile.publicPhone && (
                <a
                  href={`tel:${profile.publicPhone.replace(/\D/g, "")}`}
                  className="rounded-none w-11 h-11 flex items-center justify-center border-2 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: `${text}15`, color: text, borderColor: `${text}50` }}
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
            {serviceLine && (
              <p className="text-sm opacity-75">{serviceLine}</p>
            )}
          </div>
        </motion.div>
      </section>

      {/* HR divider */}
      <div className="relative z-10 mx-6 md:mx-12 border-t" style={{ borderColor: `${text}25` }} />

      {/* DYNAMIC SECTIONS */}
      {order.map((key) => {
        const render = sectionRenderers[key]
        return render ? <Fragment key={key}>{render()}</Fragment> : null
      })}

      {/* FOOTER */}
      <footer className="relative z-10 mt-10">
        <div className="mx-6 md:mx-12 border-t" style={{ borderColor: `${text}25` }} />
        <div className="px-6 py-6 text-center text-sm">
          {firmLine && <p className="mb-2 text-xs opacity-75">{firmLine}</p>}
          <span className="flex flex-col md:flex-row justify-center items-center gap-2">
            © {new Date().getFullYear()} - Feito com <Heart className="w-4 h-4" /> por
            <Link href="https://advlink.site" target="_blank" className="font-bold hover:underline">
              {" "}
              AdvLink
            </Link>
          {privacyUrl ? (
            <>
              <span aria-hidden className="hidden md:inline">·</span>
              <a href={privacyUrl} className="hover:underline">Privacidade</a>
            </>
          ) : null}
          </span>
        </div>
      </footer>

      {/* Fixed contact buttons (bottom-right) — square with rounded-sm */}
      {(profile.whatsappIsFixed || profile.publicPhoneIsFixed) && (
        <div className={`${constrainToContainer ? "absolute" : "fixed"} bottom-4 right-4 z-50 flex flex-col items-end gap-3`}>
          {profile.whatsappIsFixed && profile.whatsapp ? (
            <a
              href={buildWhatsAppUrl(profile.whatsapp, profile.whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir WhatsApp"
              className="grid place-items-center w-[50px] h-[50px] rounded-sm shadow-lg border-2"
              style={{ backgroundColor: primary, color: text, borderColor: `${text}50` }}
            >
              <WhatsAppIcon className="w-6 h-6" />
            </a>
          ) : null}
          {profile.publicPhoneIsFixed && profile.publicPhone ? (
            <a
              href={`tel:${profile.publicPhone.replace(/\D/g, "")}`}
              aria-label="Ligar por telefone"
              className="grid place-items-center w-[50px] h-[50px] rounded-sm shadow-lg border-2"
              style={{ backgroundColor: primary, color: text, borderColor: `${text}50` }}
            >
              <Phone className="w-6 h-6" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  )
}
