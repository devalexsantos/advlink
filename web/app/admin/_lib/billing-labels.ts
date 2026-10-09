// Display helpers for billing data in the admin (pt-BR). Pure: safe in client components.

export type BillingStatusValue = "NONE" | "PENDING" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELED"
type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

export const billingStatusLabels: Record<BillingStatusValue, string> = {
  NONE: "Sem assinatura",
  PENDING: "Aguardando pagamento",
  ACTIVE: "Ativa",
  GRACE: "Em atraso (carência)",
  SUSPENDED: "Suspensa por falta de pagamento",
  CANCELED: "Cancelada",
}

export const billingStatusVariants: Record<BillingStatusValue, BadgeVariant> = {
  NONE: "outline",
  PENDING: "secondary",
  ACTIVE: "default",
  GRACE: "secondary",
  SUSPENDED: "destructive",
  CANCELED: "outline",
}

const billingTypeLabels: Record<string, string> = {
  UNDEFINED: "Cartão ou boleto",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
  PIX: "Pix",
}

const subscriptionStatusLabels: Record<string, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  EXPIRED: "Expirada",
  DELETED: "Encerrada",
}

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  RECEIVED_IN_CASH: "Recebido em dinheiro",
  OVERDUE: "Vencido",
  REFUNDED: "Estornado",
  REFUND_REQUESTED: "Estorno solicitado",
  CHARGEBACK_REQUESTED: "Chargeback",
  AWAITING_RISK_ANALYSIS: "Em análise",
}

export function billingStatusLabel(status: string): string {
  return billingStatusLabels[status as BillingStatusValue] ?? status
}

export function billingStatusVariant(status: string): BadgeVariant {
  return billingStatusVariants[status as BillingStatusValue] ?? "outline"
}

export function billingTypeLabel(type: string | null | undefined): string {
  if (!type) return "—"
  return billingTypeLabels[type] ?? type
}

export function subscriptionStatusLabel(status: string): string {
  return subscriptionStatusLabels[status] ?? status
}

export function paymentStatusLabel(status: string): string {
  return paymentStatusLabels[status] ?? status
}

export function paidSitesLabel(count: number): string {
  if (count === 0) return "Nenhum site pago"
  return count === 1 ? "1 site pago" : `${count} sites pagos`
}

export function formatCents(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Civil dates: Prisma @db.Date serializes as midnight UTC ("2026-10-31T00:00:00.000Z") and Asaas
 * dates are "YYYY-MM-DD". Formatting in the browser zone would show the previous day in Brazil.
 */
export function formatCivilDate(value: string | null | undefined): string {
  if (!value) return "—"
  const day = value.slice(0, 10)
  const [y, m, d] = day.split("-")
  return y && m && d ? `${d}/${m}/${y}` : "—"
}
