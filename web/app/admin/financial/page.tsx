"use client"

import { useEffect, useState } from "react"
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
import { CreditCard, Users, UserX, DollarSign } from "lucide-react"

interface FinancialData {
  paying: number
  trial: number
  recentlyCancelled: number
  mrr: number
  subscriptions: Array<{
    id: string
    customerEmail: string | null
    status: string
    amount: number
    currentPeriodEnd: number
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export default function AdminFinancialPage() {
  const [data, setData] = useState<FinancialData | null>(null)

  useEffect(() => {
    fetch("/api/admin/financial")
      .then((r) => r.json())
      .then(setData)
  }, [])

  if (!data) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  const stats = [
    { label: "Pagantes", value: data.paying, icon: CreditCard },
    { label: "Trial / Free", value: data.trial, icon: Users },
    { label: "Cancelados (30d)", value: data.recentlyCancelled, icon: UserX },
    { label: "MRR", value: formatCurrency(data.mrr), icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assinaturas Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próxima renovação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-sm">{sub.customerEmail || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(sub.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="default">{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {data.subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura ativa
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
