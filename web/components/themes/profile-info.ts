import { formatCnpj } from "@/lib/cnpj"

type ServiceInfo = { officeHours?: string | null; onlineService?: boolean | null; languages?: string | null | string[] }
type FirmInfo = { firmName?: string | null; firmType?: string | null; firmOabRegistration?: string | null; firmCnpj?: string | null }

/** "Seg a sex 9h-18h · Atendimento on-line · Idiomas: Português, Inglês" (only filled parts). */
export function buildServiceLine(p: ServiceInfo): string {
  const langs = Array.isArray(p.languages) ? p.languages.join(", ") : p.languages
  return [
    p.officeHours?.trim(),
    p.onlineService ? "Atendimento on-line" : null,
    langs?.trim() ? `Idiomas: ${langs.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Law firm identification for the footer; empty when firmName is not set. */
export function buildFirmLine(p: FirmInfo): string {
  if (!p.firmName?.trim()) return ""
  return [
    p.firmName.trim(),
    p.firmType === "individual" ? "Sociedade Individual de Advocacia" : p.firmType === "sociedade" ? "Sociedade de Advogados" : null,
    p.firmOabRegistration?.trim() ? `Registro OAB nº ${p.firmOabRegistration.trim()}` : null,
    p.firmCnpj ? `CNPJ ${formatCnpj(p.firmCnpj)}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
