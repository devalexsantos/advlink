// Civil dates (calendar day in America/Sao_Paulo) for due dates and grace periods.
// Instants are `Date` (UTC); civil dates are "YYYY-MM-DD" strings with no time or zone.
// Ported from the Escavador project (packages/core/src/civil-date.ts).

export const BUSINESS_TZ = "America/Sao_Paulo"

export type CivilDate = string & { readonly __civil: unique symbol }

const CIVIL_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseCivilDate(value: string): CivilDate {
  const m = CIVIL_RE.exec(value)
  if (!m) throw new Error(`data civil inválida: "${value}"`)
  const [, y, mo, d] = m
  const probe = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  if (probe.getUTCFullYear() !== Number(y) || probe.getUTCMonth() !== Number(mo) - 1 || probe.getUTCDate() !== Number(d)) {
    throw new Error(`data civil inexistente: "${value}"`)
  }
  return value as CivilDate
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Calendar day in São Paulo for an instant. */
export function civilDateOf(instant: Date): CivilDate {
  return dayFormatter.format(instant) as CivilDate
}

export function addDays(date: CivilDate, days: number): CivilDate {
  if (!Number.isInteger(days)) throw new Error("days deve ser inteiro")
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10) as CivilDate
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** For Prisma @db.Date columns: midnight UTC of the civil date (no zone shift on read/write). */
export function civilToDbDate(date: CivilDate | null): Date | null {
  return date ? new Date(`${date}T00:00:00.000Z`) : null
}

export function dbDateToCivil(value: Date | null | undefined): CivilDate | null {
  return value ? (value.toISOString().slice(0, 10) as CivilDate) : null
}
