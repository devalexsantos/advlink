export const DEFAULT_SECTION_ORDER = [
  "servicos",
  "sobre",
  "galeria",
  "links",
  "calendly",
  "endereco",
] as const

export type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number]

export const DEFAULT_SECTION_LABELS: Record<SectionKey, string> = {
  servicos: "Serviços",
  sobre: "Sobre",
  galeria: "Galeria",
  links: "Links",
  calendly: "Agende uma conversa",
  endereco: "Endereço",
}

export type SectionLabels = Partial<Record<SectionKey, string>>

export function getSectionOrder(
  saved: SectionKey[] | null | undefined,
): SectionKey[] {
  if (!saved || saved.length === 0) return [...DEFAULT_SECTION_ORDER]
  const result = [...saved]
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!result.includes(key)) result.push(key)
  }
  return result.filter((k) =>
    (DEFAULT_SECTION_ORDER as readonly string[]).includes(k),
  ) as SectionKey[]
}

export function getSectionLabel(
  key: SectionKey,
  customLabels?: SectionLabels | null,
): string {
  return customLabels?.[key] || DEFAULT_SECTION_LABELS[key]
}
