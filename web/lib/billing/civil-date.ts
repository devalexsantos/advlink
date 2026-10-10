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

/** Day of the month (1-31) in São Paulo for an instant. */
export function saoPauloDayOfMonth(instant: Date): number {
  return Number(civilDateOf(instant).slice(8, 10))
}

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const

export interface MonthRange {
  /** Inclusive start: first day of the month at 00:00 São Paulo. */
  from: Date
  /** Exclusive end: first day of the next month at 00:00 São Paulo. */
  to: Date
  /** "YYYY-MM" */
  key: string
  monthName: string
}

/** São Paulo is fixed at UTC-3 (no DST), so local midnight = 03:00 UTC. */
function monthStart(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1, 3, 0, 0, 0))
}

/** The calendar month before the one containing `now`, in São Paulo time. */
export function previousMonthRange(now: Date): MonthRange {
  const [y, m] = civilDateOf(now).split("-").map(Number) as [number, number]
  const curIdx = m - 1
  const prevYear = curIdx === 0 ? y - 1 : y
  const prevIdx = (curIdx + 11) % 12
  return {
    from: monthStart(prevYear, prevIdx),
    to: monthStart(y, curIdx),
    key: `${prevYear}-${String(prevIdx + 1).padStart(2, "0")}`,
    monthName: MONTH_NAMES[prevIdx],
  }
}

/** The month before a given range (used for the month-over-month comparison). */
export function monthBefore(range: MonthRange): MonthRange {
  return previousMonthRange(range.from)
}
