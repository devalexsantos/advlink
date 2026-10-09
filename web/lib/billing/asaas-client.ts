// Asaas API v3 client (sandbox and production). Ported from Escavador
// (packages/integrations/src/asaas/client.ts), validated against the sandbox on 2026-10-09.
import { PLAN } from "./plan"

export type AsaasEnvironment = "SANDBOX" | "PRODUCTION"
/** UNDEFINED = card + boleto on the hosted checkout; PIX = recurring Pix. */
export type LinkBillingType = "UNDEFINED" | "PIX"

export interface AsaasPayment {
  id: string
  status: string
  value: number
  netValue?: number
  billingType: string
  dueDate: string
  paymentDate?: string | null
  confirmedDate?: string | null
  subscription?: string | null
  customer: string
  externalReference?: string | null
  deleted?: boolean
  invoiceUrl?: string | null
}

export interface AsaasSubscription {
  id: string
  status: string
  value: number
  customer: string
  billingType?: string
  externalReference?: string | null
  nextDueDate?: string
  deleted?: boolean
}

export interface PaymentLinkInput {
  billingType: LinkBillingType
  externalReference: string
}

export interface AsaasApi {
  readonly environment: AsaasEnvironment
  createPaymentLink(input: PaymentLinkInput): Promise<{ id: string; url: string }>
  disablePaymentLink(id: string): Promise<void>
  getPayment(id: string): Promise<AsaasPayment>
  getSubscription(id: string): Promise<AsaasSubscription>
  deleteSubscription(id: string): Promise<void>
  /** Payments created for a site (externalReference = profileId), newest first. */
  listPaymentsByReference(externalReference: string): Promise<AsaasPayment[]>
}

export class AsaasError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export class HttpAsaas implements AsaasApi {
  readonly environment: AsaasEnvironment
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.environment = this.baseUrl.includes("sandbox") ? "SANDBOX" : "PRODUCTION"
    const sandboxKey = apiKey.startsWith("$aact_hmlg_")
    if (sandboxKey !== (this.environment === "SANDBOX")) {
      throw new Error("chave do Asaas não combina com ASAAS_BASE_URL (sandbox × produção)")
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: {
        access_token: this.apiKey,
        "User-Agent": "advlink",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    })
    const text = await res.text()
    if (!res.ok) throw new AsaasError(`Asaas ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`, res.status)
    return (text ? JSON.parse(text) : undefined) as T
  }

  async createPaymentLink(input: PaymentLinkInput) {
    const r = await this.request<{ id: string; url: string }>("POST", "/paymentLinks", {
      name: PLAN.name,
      description: PLAN.description,
      value: PLAN.valueCents / 100,
      billingType: input.billingType,
      chargeType: "RECURRENT",
      subscriptionCycle: "MONTHLY",
      dueDateLimitDays: PLAN.boletoDueDateLimitDays,
      externalReference: input.externalReference,
      notificationEnabled: true,
    })
    return { id: r.id, url: r.url }
  }

  async disablePaymentLink(id: string) {
    // Asaas requires these fields again even when only disabling
    await this.request("PUT", `/paymentLinks/${encodeURIComponent(id)}`, {
      active: false,
      chargeType: "RECURRENT",
      subscriptionCycle: "MONTHLY",
      dueDateLimitDays: PLAN.boletoDueDateLimitDays,
    })
  }

  getPayment(id: string) {
    return this.request<AsaasPayment>("GET", `/payments/${encodeURIComponent(id)}`)
  }

  getSubscription(id: string) {
    return this.request<AsaasSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`)
  }

  async deleteSubscription(id: string) {
    await this.request("DELETE", `/subscriptions/${encodeURIComponent(id)}`)
  }

  async listPaymentsByReference(externalReference: string) {
    const r = await this.request<{ data: AsaasPayment[] }>(
      "GET",
      `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=20`
    )
    return r.data ?? []
  }
}

let cached: AsaasApi | null | undefined

/** Client from ASAAS_API_KEY / ASAAS_BASE_URL; null when billing isn't configured. */
export function getAsaas(): AsaasApi | null {
  if (cached !== undefined) return cached
  const key = process.env.ASAAS_API_KEY
  const baseUrl = process.env.ASAAS_BASE_URL
  cached = key && baseUrl ? new HttpAsaas(key, baseUrl) : null
  return cached
}

/** Tests only. */
export function setAsaasForTests(api: AsaasApi | null | undefined) {
  cached = api
}
