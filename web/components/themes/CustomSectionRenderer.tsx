"use client"

import { motion } from "framer-motion"
import { renderContent } from "@/lib/render-content"
import { getIconComponent } from "@/lib/icon-renderer"
import { getVideoEmbedUrl } from "@/lib/video-embed"

type ButtonConfig = {
  url: string
  label: string
  bgColor: string
  textColor: string
  borderRadius: number
  iconName?: string
}

type CustomSection = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  layout: string
  iconName: string
  videoUrl?: string | null
  buttonConfig?: ButtonConfig | null
}

type Props = {
  section: CustomSection
  label: string
  iconName: string
  primary: string
  text: string
  secondary: string
  themeVariant: "modern" | "classic" | "corporate"
  forceMobile?: boolean
  hideTitle?: boolean
}

export default function CustomSectionRenderer({ section, label, iconName, primary, text, secondary, themeVariant, forceMobile = false, hideTitle = false }: Props) {
  const Icon = getIconComponent(iconName)
  const html = renderContent(section.description)

  const isClassic = themeVariant === "classic"
  const isCorporate = themeVariant === "corporate"

  const headingClass = isClassic
    ? "mb-8 text-4xl md:text-5xl font-bold flex justify-center items-center gap-3 font-serif"
    : isCorporate
      ? "mb-8 text-3xl md:text-4xl font-bold flex justify-center items-center gap-3"
      : "mb-8 text-5xl font-bold flex justify-center items-center gap-3"

  const iconSize = isCorporate ? "w-8 h-8" : "w-10 h-10"

  const renderBody = () => {
    // Video layout
    if (section.layout === "video" && section.videoUrl) {
      const embed = getVideoEmbedUrl(section.videoUrl)
      if (embed) {
        return (
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={embed.embedUrl}
                className="absolute inset-0 w-full h-full rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={section.title}
              />
            </div>
          </div>
        )
      }
    }

    // Button layout
    if (section.layout === "button" && section.buttonConfig) {
      const bc = section.buttonConfig
      const BtnIcon = bc.iconName ? getIconComponent(bc.iconName) : null
      return (
        <div className="max-w-5xl mx-auto flex justify-center">
          <a
            href={bc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: bc.bgColor,
              color: bc.textColor,
              borderRadius: `${bc.borderRadius}px`,
              padding: "16px 48px",
              fontSize: "1.125rem",
              fontWeight: 600,
            }}
            className="hover:opacity-90 inline-flex items-center gap-2 no-underline transition-opacity"
          >
            {BtnIcon && <BtnIcon className="w-5 h-5" />}
            {bc.label || "Clique aqui"}
          </a>
        </div>
      )
    }

    if (section.layout === "text-only" || !section.imageUrl) {
      return (
        <div className="max-w-5xl mx-auto">
          {html && (
            <div
              className={isClassic
                ? "rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] border"
                : isCorporate
                  ? "rounded-none p-6 border-2 bg-white/5"
                  : "rounded-2xl p-6 backdrop-blur-md bg-white/10 shadow-lg"
              }
              style={isClassic
                ? { background: `linear-gradient(180deg, ${text}0f, ${text}08)`, borderColor: `${text}22` }
                : isCorporate
                  ? { borderColor: `${text}20` }
                  : {}
              }
            >
              <div
                className="prose prose-invert max-w-none text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </div>
      )
    }

    const imageEl = (
      <div className="rounded-2xl overflow-hidden shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={section.imageUrl} alt={section.title} className="w-full h-full object-cover" />
      </div>
    )

    const textEl = html ? (
      <div
        className="prose prose-invert max-w-none text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : null

    return (
      <div className={`max-w-6xl mx-auto grid ${forceMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-8 items-center`}>
        {section.layout === "image-left" ? (
          <>{imageEl}{textEl}</>
        ) : (
          <>{textEl}{imageEl}</>
        )}
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: isClassic ? 36 : isCorporate ? 0 : 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: isClassic ? 0.6 : isCorporate ? 0.6 : 0.8 }}
      className="relative z-10 px-6 py-16 text-center"
    >
      {!hideTitle && (
        <>
          {isClassic && (
            <div
              className="mx-auto mb-8 h-[2px] w-24 rounded"
              style={{ background: `linear-gradient(to right, transparent, ${text}55, transparent)` }}
            />
          )}
          <h2 className={headingClass} style={{ color: secondary }}>
            {Icon && <Icon className={iconSize} style={{ color: secondary }} />} {label}
          </h2>
        </>
      )}
      {renderBody()}
      {isCorporate && (
        <div className="mt-14 mx-auto max-w-6xl border-t" style={{ borderColor: `${text}25` }} />
      )}
    </motion.section>
  )
}
