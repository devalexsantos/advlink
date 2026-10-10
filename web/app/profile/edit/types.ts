import { z } from "zod"
import { normalizeOabNumber, UF_LIST } from "@/lib/oab"

export const profileEditSchema = z.object({
  publicName: z.string().min(2, "Informe pelo menos 2 caracteres."),
  headline: z.string().optional().or(z.literal("").transform(() => undefined)),
  // OAB: optional here (existing sites may not have it yet), but validated when filled
  oabNumber: z
    .string()
    .optional()
    .refine((v) => !v || normalizeOabNumber(v) !== null, {
      message: "Número da OAB inválido. Use até 6 dígitos, com letra opcional (ex.: 123456 ou 123456A).",
    }),
  oabState: z
    .string()
    .optional()
    .refine((v) => !v || (UF_LIST as readonly string[]).includes(v), { message: "UF da OAB inválida." }),
  practiceType: z.enum(["autonomo", "escritorio", ""]).optional(),
  aboutDescription: z
    .string()
    .max(5000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  publicEmail: z
    .string()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  publicPhone: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  whatsapp: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  instagramUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  calendlyUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // SEO
  metaTitle: z.string().max(80, "Máximo de 80 caracteres.").optional().or(z.literal("").transform(() => undefined)),
  metaDescription: z.string().optional().or(z.literal("").transform(() => undefined)),
  keywords: z.string().optional().or(z.literal("").transform(() => undefined)),
  gtmContainerId: z
    .string()
    .trim()
    .regex(/^GTM-[A-Z0-9]{4,10}$/i, "Use o formato GTM-XXXXXXX")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Address (all optional)
  addressPublic: z.boolean().optional(),
  zipCode: z.string().optional().or(z.literal("").transform(() => undefined)),
  street: z.string().optional().or(z.literal("").transform(() => undefined)),
  number: z.string().optional().or(z.literal("").transform(() => undefined)),
  complement: z.string().optional().or(z.literal("").transform(() => undefined)),
  neighborhood: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: z.string().optional().or(z.literal("").transform(() => undefined)),
  state: z.string().optional().or(z.literal("").transform(() => undefined)),
})

export type ProfileEditValues = z.infer<typeof profileEditSchema>

export type Area = {
  id: string
  title: string
  description: string | null
  coverImageUrl?: string | null
  position?: number
}

export type LinkItem = {
  id: string
  title: string
  description: string | null
  url: string
  coverImageUrl?: string | null
  position?: number
}

export type GalleryItem = {
  id: string
  coverImageUrl?: string | null
  position?: number
}

export type AddressData = {
  public?: boolean | null
  zipCode?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}

export type ButtonConfig = {
  url: string
  label: string
  bgColor: string
  textColor: string
  borderRadius: number
  iconName?: string
}

export type TeamMemberItem = {
  id: string
  name: string
  description: string | null
  avatarUrl: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  oabNumber?: string | null
  oabState?: string | null
  position?: number
}

export type CustomSectionItem = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  layout: "image-left" | "image-right" | "text-only" | "video" | "button"
  iconName: string
  position?: number
  videoUrl?: string | null
  buttonConfig?: ButtonConfig | null
}

export type ProfileData = {
  publicName?: string | null
  headline?: string | null
  oabNumber?: string | null
  oabState?: string | null
  practiceType?: "autonomo" | "escritorio" | null
  firstPublishedAt?: string | null
  aboutDescription?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  publicPhoneIsFixed?: boolean | null
  whatsapp?: string | null
  whatsappIsFixed?: boolean | null
  instagramUrl?: string | null
  calendlyUrl?: string | null
  avatarUrl?: string | null
  coverUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  textColor?: string | null
  slug?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string | null
  gtmContainerId?: string | null
  theme?: string | null
  sectionOrder?: string[] | null
  sectionLabels?: Record<string, string> | null
  sectionIcons?: Record<string, string> | null
  sectionTitleHidden?: Record<string, boolean> | null
}

export type FetchProfileResponse = {
  profile: ProfileData | null
  areas: Area[]
  address?: AddressData
  links: LinkItem[]
  gallery: GalleryItem[]
  customSections: CustomSectionItem[]
  teamMembers: TeamMemberItem[]
  profileId?: string
}
