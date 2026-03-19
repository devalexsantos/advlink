export const DEFAULT_SECTION_ORDER = [
  "servicos",
  "sobre",
  "galeria",
  "links",
  "equipe",
  "calendly",
  "endereco",
] as const

export type BuiltInSectionKey = (typeof DEFAULT_SECTION_ORDER)[number]
export type SectionKey = BuiltInSectionKey | `custom_${string}`

export function isBuiltInKey(key: string): key is BuiltInSectionKey {
  return (DEFAULT_SECTION_ORDER as readonly string[]).includes(key)
}

export function isCustomKey(key: string): key is `custom_${string}` {
  return key.startsWith("custom_")
}

export function isValidSectionKey(key: string): key is SectionKey {
  return isBuiltInKey(key) || isCustomKey(key)
}

export const DEFAULT_SECTION_LABELS: Record<BuiltInSectionKey, string> = {
  servicos: "Serviços",
  sobre: "Sobre",
  galeria: "Galeria",
  links: "Links",
  equipe: "Equipe",
  calendly: "Agende uma conversa",
  endereco: "Endereço",
}

export const DEFAULT_SECTION_ICONS: Record<BuiltInSectionKey, string> = {
  servicos: "Scale",
  sobre: "HeartHandshake",
  galeria: "Images",
  links: "Link2",
  equipe: "Users",
  calendly: "Calendar",
  endereco: "MapPin",
}

export type SectionLabels = Partial<Record<string, string>>

export function getSectionOrder(
  saved: string[] | null | undefined,
): SectionKey[] {
  if (!saved || saved.length === 0) return [...DEFAULT_SECTION_ORDER]
  const result = saved.filter(isValidSectionKey) as SectionKey[]
  // Ensure all built-in keys exist
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!result.includes(key)) result.push(key)
  }
  return result
}

export function getSectionLabel(
  key: SectionKey,
  customLabels?: SectionLabels | null,
): string {
  if (customLabels?.[key]) return customLabels[key]!
  if (isBuiltInKey(key)) return DEFAULT_SECTION_LABELS[key]
  return key
}

export function getSectionIcon(
  key: SectionKey,
  iconOverrides?: Record<string, string> | null,
): string {
  if (iconOverrides && key in iconOverrides) return iconOverrides[key]!
  if (isBuiltInKey(key)) return DEFAULT_SECTION_ICONS[key]
  return "FileText"
}

export function isSectionTitleHidden(
  key: SectionKey,
  titleHidden?: Record<string, boolean> | null,
): boolean {
  return titleHidden?.[key] === true
}
