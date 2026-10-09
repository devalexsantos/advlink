import { getAsaas } from "./asaas-client"
import { notifyBilling } from "./notify"
import type { BillingDeps } from "./sync"

/** Production wiring of the billing sync; null when Asaas isn't configured (ASAAS_API_KEY / ASAAS_BASE_URL). */
export function getBillingDeps(): BillingDeps | null {
  const asaas = getAsaas()
  if (!asaas) return null
  return { asaas, notify: notifyBilling, log: console }
}
