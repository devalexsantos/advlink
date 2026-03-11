import { z } from "zod"

export const profileEditSchema = z.object({
  publicName: z.string().min(2, "Informe pelo menos 2 caracteres."),
  headline: z.string().optional().or(z.literal("").transform(() => undefined)),
  aboutDescription: z
    .string()
    .max(1000)
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
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/(www\.)?instagram\.com\//i, "A URL deve iniciar com https://instagram.com/")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  calendlyUrl: z
    .string()
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/calendly\.com\//i, "A URL deve iniciar com https://calendly.com/")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // SEO
  metaTitle: z.string().max(80, "Máximo de 80 caracteres.").optional().or(z.literal("").transform(() => undefined)),
  metaDescription: z.string().optional().or(z.literal("").transform(() => undefined)),
  keywords: z.string().optional().or(z.literal("").transform(() => undefined)),
  gtmContainerId: z
    .string()
    .regex(/^GTM-[A-Z0-9]+$/i, "Informe um ID válido, ex: GTM-XXXXXXX")
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
}

export type FetchProfileResponse = {
  profile: ProfileData | null
  areas: Area[]
  address?: AddressData
  links: LinkItem[]
  gallery: GalleryItem[]
}
