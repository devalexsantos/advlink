"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  UserPlus,
  Globe,
  MessageSquare,
  CreditCard,
  XCircle,
  GlobeLock,
  Filter,
} from "lucide-react"
import Link from "next/link"

type Preset = "today" | "7d" | "30d" | "custom"

interface DashboardData {
  totalUsers: number
  newUsers: number
  totalSites: number
  publishedSites: number
  openTickets: number
  activeSubscriptions: number
  recentCancellations: number
  latestUsers: {
    id: string
    name: string | null
    email: string | null
    createdAt: string
    isActive: boolean
  }[]
  latestSites: {
    id: string
    slug: string | null
    createdAt: string
    user: { name: string | null; email: string | null }
  }[]
  recentTickets: {
    id: string
    number: number
    subject: string
    status: string
    user: { name: string | null; email: string | null }
  }[]
  unansweredTickets: {
    id: string
    number: number
    subject: string
    createdAt: string
    user: { name: string | null; email: string | null }
  }[]
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
}

const statusColors: Record<string, string> = {
  open: "destructive",
  in_progress: "default",
  waiting_customer: "secondary",
  resolved: "outline",
  closed: "outline",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getPresetRange(preset: "today" | "7d" | "30d") {
  const now = new Date()
  const to = now
  let from: Date
  if (preset === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (preset === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
  return { from, to }
}

function toInputDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function AdminDashboard() {
  const [preset, setPreset] = useState<Preset>("today")
  const [from, setFrom] = useState<Date>(() => getPresetRange("today").from)
  const [to, setTo] = useState<Date>(() => getPresetRange("today").to)
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (fromDate: Date, toDate: Date) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/dashboard?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`
      )
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(from, to)
  }, [from, to, fetchData])

  function handlePreset(p: "today" | "7d" | "30d") {
    setPreset(p)
    const range = getPresetRange(p)
    setFrom(range.from)
    setTo(range.to)
    setCustomFrom("")
    setCustomTo("")
  }

  function handleCustomFilter() {
    if (!customFrom || !customTo) return
    setPreset("custom")
    setFrom(new Date(customFrom + "T00:00:00"))
    setTo(new Date(customTo + "T23:59:59"))
  }

  const presets: { key: "today" | "7d" | "30d"; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
  ]

  const globalStats = data
    ? [
        { label: "Total de usuários", value: data.totalUsers, icon: Users },
        { label: "Total de sites", value: data.totalSites, icon: Globe },
        { label: "Sites publicados", value: data.publishedSites, icon: GlobeLock },
        { label: "Tickets abertos", value: data.openTickets, icon: MessageSquare },
        { label: "Assinaturas ativas", value: data.activeSubscriptions, icon: CreditCard },
      ]
    : []

  const temporalStats = data
    ? [
        { label: "Novos usuários", value: data.newUsers, icon: UserPlus },
        { label: "Cancelamentos", value: data.recentCancellations, icon: XCircle },
      ]
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {presets.map((p) => (
          <Button
            key={p.key}
            variant={preset === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </Button>
        ))}

        <div className="flex items-end gap-2 ml-auto">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCustomFilter}
            disabled={!customFrom || !customTo}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtrar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {globalStats.map((s) => (
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
          {temporalStats.map((s) => (
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
      )}

      {/* Tables */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Latest Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.latestUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="hover:underline font-medium"
                        >
                          {u.name || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(u.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.latestUsers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum usuário no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Latest Sites */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos sites</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.latestSites.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/admin/sites/${p.id}`}
                          className="hover:underline font-medium"
                        >
                          {p.slug || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.user.name || p.user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.latestSites.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum site no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tickets recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="hover:underline font-medium"
                        >
                          <span className="text-muted-foreground font-mono">
                            #{t.number}
                          </span>{" "}
                          {t.subject}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.user.name || t.user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusColors[t.status] as
                              | "destructive"
                              | "default"
                              | "secondary"
                              | "outline"
                          }
                        >
                          {statusLabels[t.status] || t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.recentTickets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum ticket no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Unanswered Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tickets sem resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.unansweredTickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="hover:underline font-medium"
                        >
                          <span className="text-muted-foreground font-mono">
                            #{t.number}
                          </span>{" "}
                          {t.subject}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {t.user.name || t.user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.unansweredTickets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum ticket sem resposta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
