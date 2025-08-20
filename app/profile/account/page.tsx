import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import CancelSubscriptionButton from "./CancelSubscriptionButton"
import ActivateSubscriptionButton from "./ActivateSubscriptionButton"
import ReactivateSubscriptionButton from "./ReactivateSubscriptionButton"

function formatDate(ts?: number | null) {
  if (!ts) return "-"
  const d = new Date(ts * 1000)
  return d.toLocaleDateString()
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, stripeCustomerId: true, email: true } })

  let subscriptionStatus: string | null = null
  let currentPeriodEnd: number | null = null
  let cancelAtPeriodEnd = false
  let invoices: { id: string; total: number; status: string; created: number; hosted_invoice_url?: string | null }[] = []

  if (user?.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 })
    const sub = subs.data[0]
    if (sub) {
      subscriptionStatus = sub.status
      currentPeriodEnd = sub.current_period_end
      cancelAtPeriodEnd = sub.cancel_at_period_end || false
    }
    const inv = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 10 })
    invoices = inv.data.map((i) => ({ id: i.id, total: (i.total ?? (i.amount_due ?? 0)), status: i.status || "", created: i.created, hosted_invoice_url: i.hosted_invoice_url }))
  }

  function statusBadge(status?: string | null) {
    const s = (status || "").toLowerCase()
    if (s === "trialing") return <span className="font-semibold text-amber-400">Período de Teste</span>
    if (s === "canceled") return <span className="font-semibold text-red-400">Cancelado</span>
    if (s === "active" || s === "past_due") return <span className="font-semibold text-sky-400">Ativo</span>
    if (!s) return <span className="text-zinc-400">-</span>
    return <span className="font-semibold capitalize">{s}</span>
  }

  function invoiceStatusBadge(status?: string | null) {
    const s = (status || "").toLowerCase()
    if (s === "paid") return <span className="font-semibold text-sky-400">Pago</span>
    if (s === "open") return <span className="font-semibold text-amber-400">Em aberto</span>
    if (s === "uncollectible") return <span className="font-semibold text-red-400">Inadimplente</span>
    if (s === "void") return <span className="font-semibold text-zinc-400">Anulado</span>
    if (s === "draft") return <span className="font-semibold text-zinc-400">Rascunho</span>
    if (!s) return <span className="text-zinc-400">-</span>
    return <span className="font-semibold capitalize">{s}</span>
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Minha conta</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Assinatura</h2>
        <div className="grid gap-2 text-sm">
          <p><span className="text-zinc-400">Status:</span> {statusBadge(subscriptionStatus || (user?.isActive ? "active" : "canceled"))}</p>
          <p><span className="text-zinc-400">Expira em:</span> {formatDate(currentPeriodEnd)}</p>
          {cancelAtPeriodEnd && <p className="text-amber-400">Cancelamento ao final do período atual</p>}
        </div>
        <div className="mt-4 flex items-center gap-3">
          {subscriptionStatus && ["active", "trialing", "past_due"].includes(subscriptionStatus) ? (
            cancelAtPeriodEnd ? (
              <ReactivateSubscriptionButton />
            ) : (
              <CancelSubscriptionButton />
            )
          ) : (
            <ActivateSubscriptionButton />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-semibold mb-3">Histórico de Pagamentos</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum pagamento encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-400">
                  <th className="py-2">Data</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-800">
                    <td className="py-2">{formatDate(i.created)}</td>
                    <td className="py-2">R$ {(i.total / 100).toFixed(2)}</td>
                    <td className="py-2">{invoiceStatusBadge(i.status)}</td>
                    <td className="py-2">
                      {i.hosted_invoice_url ? (
                        <a href={i.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Ver fatura</a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
