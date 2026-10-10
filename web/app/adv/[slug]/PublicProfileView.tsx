import type { ComponentProps, ReactNode } from "react"
import Theme02 from "@/components/themes/02/Theme02"
import Theme03 from "@/components/themes/03/Theme03"
import Theme04 from "@/components/themes/04/Theme04"
import { ProfileTracker } from "@/components/analytics/ProfileTracker"
import { GtmConsent } from "@/components/analytics/GtmConsent"
import { getProfileUrl } from "@/lib/site-url"
import { buildFaqJsonLd, buildProfileJsonLd, jsonLdScript } from "@/lib/profile-jsonld"
import type { PublicProfileData } from "@/lib/public-profile"

const THEMES = ["modern", "classic", "corporate"] as const
type ThemeName = (typeof THEMES)[number]
type ThemeCustomSections = ComponentProps<typeof Theme03>["customSections"]
const GTM_ID = /^GTM-[A-Z0-9]{4,10}$/

export type PublicProfileViewProps = {
  data: PublicProfileData
  /** Route slug, used for the tracker and as JSON-LD fallback */
  slug: string
  /** Page-view beacon (off for previews: they must not count as visits) */
  showTracker: boolean
  /** GTM container to load; pass null to never load GTM (previews) */
  gtmContainerId?: string | null
  /**
   * Privacy notice URL (footer link and cookie banner). Absolute on the profile's own subdomain,
   * so it works wherever the page is served; the preview passes /adv/<slug>/privacidade.
   */
  privacyUrl?: string
  /** Rendered above everything (e.g. the preview strip) */
  banner?: ReactNode
}

/** Renders a lawyer's site (JSON-LD, GTM, tracker and theme). Publication checks belong to the caller. */
export default function PublicProfileView({ data, slug, showTracker, gtmContainerId, privacyUrl: privacyUrlProp, banner }: PublicProfileViewProps) {
  const { profile, areas, links, gallery, customSections, teamMembers } = data
  const address = profile.address ?? undefined

  const primary = profile.primaryColor || "#8B0000"
  const text = profile.textColor || "#FFFFFF"
  const secondary = profile.secondaryColor || "#FFFFFF"
  // Unknown/legacy values would render an empty page: fall back to the schema default
  const theme: ThemeName = THEMES.includes(profile.theme as ThemeName) ? (profile.theme as ThemeName) : "classic"
  // Re-checked here for rows saved before the API validated it: the ID is interpolated into a script
  const gtmId = gtmContainerId && GTM_ID.test(gtmContainerId) ? gtmContainerId : null
  const privacyUrl = privacyUrlProp ?? `${getProfileUrl(profile.slug ?? slug)}privacidade`
  const jsonLd = buildProfileJsonLd(
    { ...profile, slug: profile.slug ?? slug },
    address,
    areas.map((a) => a.title)
  )
  const faqJsonLd = buildFaqJsonLd(areas)

  const themeProps = {
    profile,
    areas,
    address,
    links,
    gallery,
    primary,
    text,
    secondary,
    sectionOrder: profile.sectionOrder as string[] | undefined,
    sectionLabels: profile.sectionLabels as Record<string, string> | undefined,
    // buttonConfig is a Prisma Json column; the themes read the shape the editor writes
    customSections: customSections as unknown as ThemeCustomSections,
    sectionIcons: profile.sectionIcons as Record<string, string> | undefined,
    sectionTitleHidden: profile.sectionTitleHidden as Record<string, boolean> | undefined,
    teamMembers,
    privacyUrl,
    articles: (data as { articles?: ComponentProps<typeof Theme03>["articles"] }).articles,
    slug: profile.slug ?? slug,
    siteBaseUrl: getProfileUrl(profile.slug ?? slug),
    leadFormDisabled: !showTracker || !profile.isActive,
  }

  return (
    <div>
      {banner}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }} />}
      {gtmId && <GtmConsent gtmContainerId={gtmId} privacyUrl={privacyUrl} />}
      {showTracker && <ProfileTracker slug={slug} />}
      {theme === "modern" && <Theme02 {...themeProps} />}
      {theme === "classic" && <Theme03 {...themeProps} />}
      {theme === "corporate" && <Theme04 {...themeProps} />}
    </div>
  )
}
