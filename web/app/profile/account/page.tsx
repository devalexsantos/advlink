import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSiteId } from "@/lib/active-site"
import { getProfileHost } from "@/lib/site-url"
import { formatBRL, REFUND_WINDOW_DAYS } from "@/lib/billing/plan"
import { dbDateToCivil } from "@/lib/billing/civil-date"
import { isPaidStatus } from "@/lib/billing/entitlement"
import PublishCheckout from "@/components/billing/PublishCheckout"
import CancelSubscriptionButton from "./CancelSubscriptionButton"

function formatCivil(date: string | null | undefined) {
  if (!date) return "-"
  const [y, m, d] = date.split("-")
  return `${d}/${m}/${y}`
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  NONE: { label: "Não publicado", className: "text-muted-foreground" },
  PENDING: { label: "Aguardando pagamento", className: "text-amber-700" },
  ACTIVE: { label: "Ativo", className: "text-emerald-700" },
  GRACE: { label: "Pagamento em atraso", className: "text-red-700" },
  SUSPENDED: { label: "Fora do ar (falta de pagamento)", className: "text-red-700" },
  CANCELED: { label: "Cancelado", className: "text-muted-foreground" },
}

const METHOD_LABEL: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  PIX: "Pix",
  UNDEFINED: "-",
}

function paymentStatus(status: string, revoked: boolean) {
  if (revoked) return <span className="font-semibold text-muted-foreground">Estornado</span>
  if (isPaidStatus(status)) return <span className="font-semibold text-emerald-700">Pago</span>
  if (status === "OVERDUE") return <span className="font-semibold text-red-700">Vencido</span>
  if (status === "PENDING") return <span className="font-semibold text-amber-700">Em aberto</span>
  if (status.includes("RISK_ANALYSIS") || status === "AUTHORIZED") return <span className="font-semibold text-amber-700">Em análise</span>
  return <span className="font-semibold">{status}</span>
}

/** Billing of the ACTIVE site only, from the local mirror of Asaas (UX-5 / BIL-1). */
export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return null

  const profileId = await getActiveSiteId(userId)
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    profileId
      ? prisma.profile.findFirst({
          where: { id: profileId, userId },
          select: {
            slug: true,
            publicName: true,
            name: true,
            isActive: true,
            billingStatus: true,
            paidUntil: true,
            graceUntil: true,
            suspendedByAdmin: true,
          },
        })
      : null,
  ])

  const [openSub, payments] = profileId
    ? await Promise.all([
        prisma.billingSubscription.findFirst({ where: { profileId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
        prisma.billingPayment.findMany({ where: { profileId }, orderBy: { dueDate: "desc" }, take: 24 }),
      ])
    : [null, []]

  const status = profile?.billingStatus ?? "NONE"
  // Sites published before the Asaas migration have no billing data yet
  const legacyPublished = status === "NONE" && !!profile?.isActive
  const badge = legacyPublished ? { label: "Ativo", className: "text-emerald-700" } : STATUS_LABEL[status]
  const paidUntil = dbDateToCivil(profile?.paidUntil)
  const published = status === "ACTIVE" || status === "GRACE"

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Minha conta</h1>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Assinatura deste site</h2>
        <div className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Site:</span>{" "}
            {profile?.publicName || profile?.name || "-"}
            {profile?.slug && <span className="text-muted-foreground"> ({getProfileHost(profile.slug)})</span>}
          </p>
          <p><span className="text-muted-foreground">E-mail:</span> {user?.email || "-"}</p>
          <p>
            <span className="text-muted-foreground">Status:</span> <span className={`font-semibold ${badge.className}`}>{badge.label}</span>
            {profile?.suspendedByAdmin && <span className="ml-2 font-semibold text-red-700">(suspenso pela equipe)</span>}
          </p>
          {openSub && <p><span className="text-muted-foreground">Plano:</span> {formatBRL(openSub.valueCents)}/mês, renovação automática</p>}
          {published && paidUntil && (
            <p>
              <span className="text-muted-foreground">{openSub ? "Pago até:" : "No ar até:"}</span> {formatCivil(paidUntil)}
            </p>
          )}
          {published && !openSub && (
            <p className="text-amber-700">
              Assinatura cancelada. Seu site fica no ar até {formatCivil(paidUntil)} e depois pode ser reativado a qualquer momento.
            </p>
          )}
        </div>
        <div className="mt-4">
          {published && openSub ? (
            <div className="space-y-2">
              <CancelSubscriptionButton />
              <p className="text-xs text-muted-foreground">
                Desistiu em até {REFUND_WINDOW_DAYS} dias do primeiro pagamento? Reembolso integral, pelo suporte.
              </p>
            </div>
          ) : !published && !legacyPublished && !profile?.suspendedByAdmin && profile ? (
            <PublishCheckout />
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-3">Histórico de pagamentos</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">Vencimento</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Forma</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2">{formatCivil(p.dueDate)}</td>
                    <td className="py-2">{formatBRL(p.valueCents)}</td>
                    <td className="py-2">{METHOD_LABEL[p.billingType] ?? p.billingType}</td>
                    <td className="py-2">{paymentStatus(p.status, p.revoked)}</td>
                    <td className="py-2">
                      {p.invoiceUrl ? (
                        <a href={p.invoiceUrl} target="_blank" rel="noreferrer" className="text-gray-700 hover:underline">
                          {isPaidStatus(p.status) ? "Ver comprovante" : "Pagar"}
                        </a>
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
