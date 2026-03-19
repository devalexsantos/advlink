import { z } from "zod"

export const profileEditSchema = z.object({
  publicName: z.string().min(2, "Informe pelo menos 2 caracteres."),
  headline: z.string().optional().or(z.literal("").transform(() => undefined)),
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
