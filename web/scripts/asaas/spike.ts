// Spike (sandbox only): checks which recurring payment-link variants the Asaas API accepts for AdvLink.
// Usage: node --env-file=<file with ASAAS_SANDBOX_API_KEY / ASAAS_API_KEY> web/scripts/asaas/spike.ts
export {}
const BASE = process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3"
const KEY = process.env.ASAAS_SANDBOX_API_KEY ?? process.env.ASAAS_API_KEY ?? ""

if (!BASE.includes("sandbox")) throw new Error("spike só roda no sandbox")
if (!KEY.startsWith("$aact_hmlg_")) throw new Error("chave ausente ou não é de sandbox")

async function asaas(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { access_token: KEY, "User-Agent": "advlink-spike", ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    json = text
  }
  return { status: res.status, json: json as Record<string, unknown> }
}

const ref = `advlink-spike-${Date.now()}`
const base = {
  name: "AdvLink — site profissional (spike)",
  description: "Assinatura mensal do site AdvLink",
  value: 49,
  chargeType: "RECURRENT",
  subscriptionCycle: "MONTHLY",
  dueDateLimitDays: 3,
  externalReference: ref,
  notificationEnabled: true,
}

const variants: Array<[string, Record<string, unknown>]> = [
  ["UNDEFINED recorrente", { ...base, billingType: "UNDEFINED" }],
  ["PIX recorrente", { ...base, billingType: "PIX" }],
  ["UNDEFINED + callback", { ...base, billingType: "UNDEFINED", callback: { successUrl: "https://app.advlink.site/profile/edit?checkout=retorno", autoRedirect: true } }],
]

const created: string[] = []
for (const [label, body] of variants) {
  const r = await asaas("POST", "/paymentLinks", body)
  const j = r.json ?? {}
  console.log(`\n## ${label} → HTTP ${r.status}`)
  if (r.status < 300) {
    created.push(String(j.id))
    console.log({ id: j.id, url: j.url, billingType: j.billingType, chargeType: j.chargeType, externalReference: j.externalReference, callback: j.callback })
  } else {
    console.log(JSON.stringify(j).slice(0, 500))
  }
}

console.log("\nLinks criados (abrir no navegador para testar o checkout):", created.length)
if (process.argv.includes("--cleanup")) {
  for (const id of created) {
    const r = await asaas("DELETE", `/paymentLinks/${id}`)
    console.log(`DELETE ${id} → ${r.status}`)
  }
}
