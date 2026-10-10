export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const

export type Uf = (typeof UF_LIST)[number]

const OAB_NUMBER_RE = /^(\d{1,6})([A-Z]?)$/

/**
 * Normalizes an OAB registration number: strips dots, spaces and dashes,
 * uppercases the optional 1-letter suffix. Accepts 1–6 digits + optional letter
 * (e.g. "123.456-a" → "123456A"). Returns null when invalid.
 */
export function normalizeOabNumber(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/[.\s-]/g, "").toUpperCase()
  return OAB_NUMBER_RE.test(cleaned) ? cleaned : null
}

export function isValidUf(raw: unknown): raw is Uf {
  return typeof raw === "string" && (UF_LIST as readonly string[]).includes(raw)
}

/** Normalizes a UF ("sp " → "SP"); null when not one of the 27 UFs. */
export function normalizeUf(raw: unknown): Uf | null {
  if (typeof raw !== "string") return null
  const uf = raw.trim().toUpperCase()
  return isValidUf(uf) ? uf : null
}

/** "123456A", "SP" → "OAB/SP 123.456-A". Null when either part is missing/invalid. */
export function formatOab(number: string | null | undefined, uf: string | null | undefined): string | null {
  const n = normalizeOabNumber(number)
  const state = normalizeUf(uf)
  if (!n || !state) return null
  const [, digits, suffix] = n.match(OAB_NUMBER_RE)!
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `OAB/${state} ${grouped}${suffix ? `-${suffix}` : ""}`
}

export const PRACTICE_TYPES = ["autonomo", "escritorio"] as const
export type PracticeType = (typeof PRACTICE_TYPES)[number]

export function isValidPracticeType(raw: unknown): raw is PracticeType {
  return typeof raw === "string" && (PRACTICE_TYPES as readonly string[]).includes(raw)
}

/**
 * Validates an optional OAB pair coming from an edit form. Empty strings clear
 * the field (null). Only the keys present in the input are returned as defined;
 * `undefined` means "not sent, keep current value".
 */
export function parseOptionalOab(input: {
  oabNumber?: unknown
  oabState?: unknown
}): { ok: true; data: { oabNumber?: string | null; oabState?: string | null } } | { ok: false; error: string } {
  const data: { oabNumber?: string | null; oabState?: string | null } = {}
  if (input.oabNumber !== undefined) {
    if (input.oabNumber === null || (typeof input.oabNumber === "string" && input.oabNumber.trim() === "")) {
      data.oabNumber = null
    } else {
      const n = normalizeOabNumber(input.oabNumber)
      if (!n) return { ok: false, error: "Número da OAB inválido. Use até 6 dígitos, com letra opcional (ex.: 123456 ou 123456A)." }
      data.oabNumber = n
    }
  }
  if (input.oabState !== undefined) {
    if (input.oabState === null || (typeof input.oabState === "string" && input.oabState.trim() === "")) {
      data.oabState = null
    } else {
      const uf = normalizeUf(input.oabState)
      if (!uf) return { ok: false, error: "UF da OAB inválida." }
      data.oabState = uf
    }
  }
  return { ok: true, data }
}
