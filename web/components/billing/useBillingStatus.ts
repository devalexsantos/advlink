"use client"

import { useQuery } from "@tanstack/react-query"

export type BillingStatusResponse = {
  billingStatus: "NONE" | "PENDING" | "ACTIVE" | "GRACE" | "SUSPENDED" | "CANCELED"
  published: boolean
  suspendedByAdmin: boolean
  paidUntil: string | null
  graceUntil: string | null
  renews: boolean
  pendingPayment: { invoiceUrl: string | null; dueDate: string; billingType: string; status: string } | null
}

export const BILLING_STATUS_KEY = ["billing-status"] as const

/**
 * Billing status of the active site. While `watch` is on (checkout open in another tab), polls every
 * 5s with ?refresh=1 so the server confirms the payment straight with Asaas.
 */
export function useBillingStatus({ watch = false }: { watch?: boolean } = {}) {
  return useQuery({
    queryKey: [...BILLING_STATUS_KEY, watch],
    queryFn: async (): Promise<BillingStatusResponse> => {
      const res = await fetch(`/api/billing/status${watch ? "?refresh=1" : ""}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Falha ao carregar o status do pagamento")
      return res.json()
    },
    refetchInterval: watch ? 5000 : false,
    refetchOnWindowFocus: true,
  })
}

/** "2026-11-05" -> "05/11/2026" */
export function formatCivilDate(date: string | null | undefined): string {
  if (!date) return "-"
  const [y, m, d] = date.split("-")
  return `${d}/${m}/${y}`
}
