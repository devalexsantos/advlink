// In-memory Asaas for tests (ported from Escavador's file-based FakeAsaas).
import type { AsaasApi, AsaasPayment, AsaasSubscription, LinkBillingType, PaymentLinkInput } from "./asaas-client"
import { PLANS, type BillingCycle } from "./plan"

interface FakeLink {
  id: string
  url: string
  active: boolean
  billingType: LinkBillingType
  cycle: BillingCycle
  externalReference: string
}

export class FakeAsaas implements AsaasApi {
  readonly environment = "SANDBOX" as const
  seq = 0
  links: Record<string, FakeLink> = {}
  payments: Record<string, AsaasPayment> = {}
  subscriptions: Record<string, AsaasSubscription> = {}
  calls: string[] = []

  private next(prefix: string) {
    this.seq++
    return `${prefix}_fake${String(this.seq).padStart(6, "0")}`
  }

  async createPaymentLink(input: PaymentLinkInput) {
    const id = this.next("lnk")
    this.links[id] = { id, url: `https://sandbox.asaas.com/c/${id}`, active: true, ...input }
    this.calls.push(`createPaymentLink:${input.billingType}:${input.cycle}:${input.externalReference}`)
    return { id, url: this.links[id].url }
  }

  async disablePaymentLink(id: string, cycle: BillingCycle) {
    if (!this.links[id]) throw new Error(`link ${id} não existe`)
    // The real API rejects an update whose subscriptionCycle differs from the link's
    if (this.links[id].cycle !== cycle) throw new Error(`link ${id} é ${this.links[id].cycle}, não ${cycle}`)
    this.links[id].active = false
    this.calls.push(`disablePaymentLink:${id}`)
  }

  async getPayment(id: string) {
    const p = this.payments[id]
    if (!p) throw new Error(`payment ${id} não existe`)
    return { ...p }
  }

  async getSubscription(id: string) {
    const s = this.subscriptions[id]
    if (!s) throw new Error(`subscription ${id} não existe`)
    return { ...s }
  }

  async deleteSubscription(id: string) {
    if (this.subscriptions[id]) Object.assign(this.subscriptions[id], { status: "INACTIVE", deleted: true })
    this.calls.push(`deleteSubscription:${id}`)
  }

  async listPaymentsByReference(externalReference: string) {
    this.calls.push(`listPaymentsByReference:${externalReference}`)
    return Object.values(this.payments).filter((p) => p.externalReference === externalReference)
  }

  /** Customer pays through the link: creates subscription + first charge with the given status. */
  simulatePayment(linkId: string, opts: { status: string; dueDate: string; billingType?: string }) {
    const link = this.links[linkId]
    if (!link?.active) throw new Error(`link ${linkId} inativo ou inexistente`)
    const subscription: AsaasSubscription = {
      id: this.next("sub"),
      status: "ACTIVE",
      value: PLANS[link.cycle].valueCents / 100,
      customer: "cus_fake",
      billingType: opts.billingType ?? "CREDIT_CARD",
      cycle: link.cycle,
      externalReference: link.externalReference,
    }
    this.subscriptions[subscription.id] = subscription
    const payment = this.addPayment(subscription.id, opts)
    return { payment, subscription }
  }

  /** Next charge (monthly or yearly, per the subscription) of an existing subscription. */
  addPayment(subscriptionId: string, opts: { status: string; dueDate: string; billingType?: string }) {
    const sub = this.subscriptions[subscriptionId]
    const payment: AsaasPayment = {
      id: this.next("pay"),
      status: opts.status,
      value: sub.value,
      netValue: sub.value - 1,
      billingType: opts.billingType ?? sub.billingType ?? "CREDIT_CARD",
      dueDate: opts.dueDate,
      paymentDate: /CONFIRMED|RECEIVED/.test(opts.status) ? opts.dueDate : null,
      subscription: subscriptionId,
      customer: sub.customer,
      externalReference: sub.externalReference,
      invoiceUrl: `https://sandbox.asaas.com/i/${subscriptionId}-${this.seq}`,
    }
    this.payments[payment.id] = payment
    return payment
  }

  setPaymentStatus(id: string, status: string) {
    this.payments[id].status = status
    return this.payments[id]
  }
}
