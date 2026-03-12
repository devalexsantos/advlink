"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting_customer", label: "Aguardando cliente" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
]

const priorityOptions = [
  { value: "all", label: "Todas" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
]

const categoryOptions = [
  { value: "all", label: "Todas" },
  { value: "support", label: "Suporte" },
  { value: "billing", label: "Cobrança" },
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Sugestão" },
]

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando",
  resolved: "Resolvido",
  closed: "Fechado",
}

const statusColors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  open: "destructive",
  in_progress: "default",
  waiting_customer: "secondary",
  resolved: "outline",
  closed: "outline",
}

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

interface Ticket {
  id: string
  number: number
  subject: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
  user: { name: string | null; email: string | null }
  assignedAdmin: { name: string | null; email: string | null } | null
  _count: { messages: number }
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [category, setCategory] = useState("all")

  useEffect(() => {
    const params = new URLSearchParams()
    if (status !== "all") params.set("status", status)
    if (priority !== "all") params.set("priority", priority)
    if (category !== "all") params.set("category", category)

    fetch(`/api/admin/tickets?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets || [])
        setTotal(data.total || 0)
      })
  }, [status, priority, category])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tickets ({total})</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Msgs</TableHead>
                <TableHead>Atribuído a</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    #{t.number}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium hover:underline">
                      {t.subject}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.user.name || t.user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[t.status]}>
                      {statusLabels[t.status] || t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{priorityLabels[t.priority] || t.priority}</TableCell>
                  <TableCell className="text-sm">{t._count.messages}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.assignedAdmin?.name || t.assignedAdmin?.email || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum ticket encontrado
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
