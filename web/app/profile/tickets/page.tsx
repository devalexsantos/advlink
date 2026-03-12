"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando resposta",
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

interface Ticket {
  id: string
  number: number
  subject: string
  status: string
  category: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

export default function UserTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then(setTickets)
  }, [])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Tickets</h1>
        <Button asChild>
          <Link href="/profile/tickets/new">
            <Plus className="h-4 w-4 mr-2" /> Novo Ticket
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Msgs</TableHead>
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
                    <Link href={`/profile/tickets/${t.id}`} className="font-medium hover:underline">
                      {t.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[t.status]}>
                      {statusLabels[t.status] || t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t._count.messages}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum ticket. Crie um novo para entrar em contato.
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
