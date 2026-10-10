"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Ban, CreditCard, DollarSign, UserX, Wallet } from "lucide-react"
import {
  billingStatusLabel,
  billingStatusVariant,
  billingTypeLabel,
  cycleLabel,
  formatCents,
  formatCivilDate,
  formatSubscriptionValue,
  subscriptionStatusLabel,
} from "@/app/admin/_lib/billing-labels"

interface SubscriptionRow {
  id: string
  status: string
  valueCents: number
  cycle?: string | null
  billingType: string | null
  nextDueDate: string | null
  canceledAt: string | null
  createdAt: string
  profile: {
    id: string
    slug: string | null
    publicName: string | null
    name: string | null
    billingStatus: string
    paidUntil: string | null
    suspendedByAdmin: boolean
    user: { email: string | null }
  }
}

interface FinancialData {
  environment: string
  paying: number
  overdue: number
  delinquent: number
  pending: number
  recentlyCancelled: number
  mrrCents: number
  monthRevenueCents: number
  monthNetRevenueCents: number
  monthPayments: number
  subscriptions: SubscriptionRow[]
  total: number
  page: number
  perPage: number
}

export default function AdminFinancialPage() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/financial?page=${page}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d: FinancialData) => {
        setData(d)
        setError(false)
      })
      .catch(() => setError(true))
  }, [page])

  if (error) return <div className="p-8 text-center text-destructive">Não foi possível carregar o financeiro.</div>
  if (!data) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage))
  const stats = [
    { label: "Sites pagantes", value: data.paying, icon: CreditCard },
    { label: "Em atraso (carência)", value: data.overdue, icon: AlertTriangle },
    { label: "Inadimplentes (suspensos)", value: data.delinquent, icon: Ban },
    { label: "Cancelados (30d)", value: data.recentlyCancelled, icon: UserX },
    { label: "MRR", value: formatCents(data.mrrCents), icon: DollarSign },
    {
      label: "Receita do mês",
      value: formatCents(data.monthRevenueCents),
      hint: `${data.monthPayments} pagamento(s) · líquido ${formatCents(data.monthNetRevenueCents)}`,
      icon: Wallet,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        {data.environment !== "PRODUCTION" && <Badge variant="secondary">Asaas sandbox</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
              {s.hint && <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assinaturas ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Cobrança do site</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Pago até</TableHead>
                <TableHead>Forma de pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-sm">
                    <Link href={`/admin/sites/${sub.profile.id}`} className="font-medium hover:underline">
                      {sub.profile.publicName || sub.profile.name || sub.profile.slug || "—"}
                    </Link>
                    {sub.profile.slug && <p className="text-xs text-muted-foreground">{sub.profile.slug}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{sub.profile.user.email || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{formatSubscriptionValue(sub.valueCents, sub.cycle)}</span>
                    <p className="text-xs text-muted-foreground">{cycleLabel(sub.cycle)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={billingStatusVariant(sub.profile.billingStatus)}>
                      {billingStatusLabel(sub.profile.billingStatus)}
                    </Badge>
                    {sub.profile.suspendedByAdmin && (
                      <Badge variant="destructive" className="ml-1">Suspenso pela equipe</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{subscriptionStatusLabel(sub.status)}</TableCell>
                  <TableCell className="text-sm">{formatCivilDate(sub.profile.paidUntil)}</TableCell>
                  <TableCell className="text-sm">{billingTypeLabel(sub.billingType)}</TableCell>
                </TableRow>
              ))}
              {data.subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
