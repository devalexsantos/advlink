// Creates (or updates) the AdvLink webhook in the configured Asaas account. Idempotent.
// Ported from Escavador (infra/asaas/register-webhook.ts). Never prints the key or the token.
//   node --env-file=<env file> web/scripts/asaas/register-webhook.ts [--url https://.../api/webhooks/asaas] [--name advlink]
// Needs ASAAS_API_KEY, ASAAS_BASE_URL, ASAAS_WEBHOOK_AUTH_TOKEN (>= 32 chars) and ASAAS_WEBHOOK_ALERT_EMAIL.
export {}

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag)
  return i > 0 ? process.argv[i + 1] : undefined
}
const NAME = arg("--name") ?? "advlink"
const URL_ = arg("--url") ?? "https://app.advlink.site/api/webhooks/asaas"
const EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_REFUND_DENIED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_DELETED",
]

const { ASAAS_API_KEY: key, ASAAS_BASE_URL: base, ASAAS_WEBHOOK_AUTH_TOKEN: token, ASAAS_WEBHOOK_ALERT_EMAIL: email } = process.env
if (!key || !base || !token || token.length < 32 || !email) {
  throw new Error("faltam ASAAS_API_KEY, ASAAS_BASE_URL, ASAAS_WEBHOOK_AUTH_TOKEN (>= 32) ou ASAAS_WEBHOOK_ALERT_EMAIL")
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(base!.replace(/\/+$/, "") + path, {
    method,
    headers: { access_token: key!, "User-Agent": "advlink", ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : undefined) as T
}

type Hook = { id: string; name: string; url: string; enabled: boolean; interrupted: boolean; events: string[] }
const list = await call<{ data: Hook[] }>("GET", "/webhooks?limit=100")
const body = {
  name: NAME,
  url: URL_,
  email,
  enabled: true,
  interrupted: false,
  apiVersion: 3,
  authToken: token,
  sendType: "SEQUENTIALLY",
  events: EVENTS,
}
const current = list.data.find((w) => w.name === NAME)
const saved = current ? await call<Hook>("PUT", `/webhooks/${current.id}`, body) : await call<Hook>("POST", "/webhooks", body)
console.log(
  `${current ? "atualizado" : "criado"}: ${saved.id} · ${saved.url} · ${saved.events.length} eventos · ativo=${saved.enabled} · ` +
    `interrompido=${saved.interrupted} · ambiente=${base.includes("sandbox") ? "sandbox" : "produção"} · webhooks na conta=${list.data.length + (current ? 0 : 1)}/10`
)
