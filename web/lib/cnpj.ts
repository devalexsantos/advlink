/** CNPJ helpers: digits only, check-digit validation and the 00.000.000/0000-00 mask. */
export function normalizeCnpj(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const d = normalizeCnpj(value)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return check(12) === Number(d[12]) && check(13) === Number(d[13])
}

export function formatCnpj(value: string | null | undefined): string {
  const d = normalizeCnpj(value)
  if (d.length !== 14) return d
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
