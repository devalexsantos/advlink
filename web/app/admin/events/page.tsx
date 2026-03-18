"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowRight, UserPlus, Globe, CreditCard } from "lucide-react"

// ─── Event log types ─────────────────────────────────────────────────────────

const eventLabels: Record<string, string> = {
  user_signed_up: "Cadastro",
  site_created: "Site criado",
  site_published: "Site publicado",
  custom_domain_connected: "Domínio conectado",
  ticket_created: "Ticket criado",
  subscription_started: "Assinatura iniciada",
}

const eventColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  user_signed_up: "secondary",
  site_created: "default",
  site_published: "default",
  custom_domain_connected: "default",
  ticket_created: "outline",
  subscription_started: "destructive",
}

interface EventUser {
  id: string
  name: string | null
  email: string | null
}

interface ProductEvent {
  id: string
  type: string
  userId: string | null
  siteId: string | null
  metaJson: Record<string, unknown> | null
  createdAt: string
  user: EventUser | null
}

interface StatItem {
  type: string
  count: number
}

// ─── Funnel types ────────────────────────────────────────────────────────────

interface FunnelCounts {
  signup_only: number
  site_created: number
  published: number
}

interface FunnelUser {
  id: string
  name: string | null
  email: string | null
  createdAt: string
  isActive: boolean
  completed_onboarding: boolean
  profiles: { slug: string | null }[]
}

// ─── Stages config ───────────────────────────────────────────────────────────

const stages = [
  {
    key: "signup_only" as const,
    label: "Só cadastro",
    description: "Cadastrou mas não criou o site",
    icon: UserPlus,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    activeBg: "bg-orange-100 ring-2 ring-orange-400",
  },
  {
    key: "site_created" as const,
    label: "Site criado",
    description: "Criou o site mas não assinou",
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    activeBg: "bg-blue-100 ring-2 ring-blue-400",
  },
  {
    key: "published" as const,
    label: "Publicado",
    description: "Assinatura ativa, site no ar",
    icon: CreditCard,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    activeBg: "bg-green-100 ring-2 ring-green-400",
  },
]

function daysAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (d === 0) return "hoje"
  if (d === 1) return "ontem"
  return `${d}d atrás`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  // Events state
  const [events, setEvents] = useState<ProductEvent[]>([])
  const [stats, setStats] = useState<StatItem[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventType, setEventType] = useState("all")
  const [eventsPage, setEventsPage] = useState(1)

  // Funnel state
  const [funnel, setFunnel] = useState<FunnelCounts>({ signup_only: 0, site_created: 0, published: 0 })
  const [funnelStage, setFunnelStage] = useState<"signup_only" | "site_created" | "published">("signup_only")
  const [funnelUsers, setFunnelUsers] = useState<FunnelUser[]>([])
  const [funnelTotal, setFunnelTotal] = useState(0)
  const [funnelPage, setFunnelPage] = useState(1)

  // Fetch events
  useEffect(() => {
    const params = new URLSearchParams()
    if (eventType !== "all") params.set("type", eventType)
    params.set("page", String(eventsPage))

    fetch(`/api/admin/events?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || [])
        setEventsTotal(data.total || 0)
        setStats(data.stats || [])
      })
  }, [eventType, eventsPage])

  // Fetch funnel
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("stage", funnelStage)
    params.set("page", String(funnelPage))

    fetch(`/api/admin/funnel?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setFunnel(data.funnel)
        setFunnelUsers(data.users || [])
        setFunnelTotal(data.total || 0)
      })
  }, [funnelStage, funnelPage])

  const eventTypes = stats.map((s) => s.type)
  const eventsTotalPages = Math.ceil(eventsTotal / 30)
  const funnelTotalPages = Math.ceil(funnelTotal / 20)

  const totalUsers = funnel.signup_only + funnel.site_created + funnel.published

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eventos e Funil</h1>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Funil de Conversão</TabsTrigger>
          <TabsTrigger value="events">Log de Eventos ({eventsTotal})</TabsTrigger>
        </TabsList>

        {/* ─── Funnel Tab ──────────────────────────────────────────────── */}
        <TabsContent value="funnel" className="space-y-6 mt-4">
          {/* Funnel visual */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {stages.map((s, i) => {
              const count = funnel[s.key]
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              const isActive = funnelStage === s.key

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <Card
                    className={`flex-1 cursor-pointer border transition-all ${isActive ? s.activeBg : s.bg} hover:shadow-md`}
                    onClick={() => { setFunnelStage(s.key); setFunnelPage(1) }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${s.color} bg-white/80`}>
                          <s.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs text-muted-foreground">{pct}% dos usuários</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{s.description}</p>
                    </CardContent>
                  </Card>
                  {i < stages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden md:block" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Users table for selected stage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {stages.find((s) => s.key === funnelStage)?.label} ({funnelTotal})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funnelUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                          {u.name || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.profiles?.[0]?.slug ? (
                          <span className="text-foreground">{u.profiles[0].slug}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {daysAgo(u.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {funnelUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum usuário nesta etapa
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {funnelTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={funnelPage <= 1}
                onClick={() => setFunnelPage(funnelPage - 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm">Página {funnelPage} de {funnelTotalPages}</span>
              <button
                disabled={funnelPage >= funnelTotalPages}
                onClick={() => setFunnelPage(funnelPage + 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </TabsContent>

        {/* ─── Events Tab ──────────────────────────────────────────────── */}
        <TabsContent value="events" className="space-y-6 mt-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <Card
                key={s.type}
                className={`cursor-pointer transition-colors ${eventType === s.type ? "ring-2 ring-primary" : ""}`}
                onClick={() => { setEventType(eventType === s.type ? "all" : s.type); setEventsPage(1) }}
              >
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {eventLabels[s.type] || s.type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold">{s.count}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={eventType} onValueChange={(v) => { setEventType(v); setEventsPage(1) }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {eventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {eventLabels[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={eventColors[e.type] || "outline"}>
                          {eventLabels[e.type] || e.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.user ? (
                          <Link
                            href={`/admin/users/${e.user.id}`}
                            className="hover:underline text-foreground"
                          >
                            {e.user.name || e.user.email}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[300px] truncate">
                        {e.metaJson ? JSON.stringify(e.metaJson) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum evento registrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {eventsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={eventsPage <= 1}
                onClick={() => setEventsPage(eventsPage - 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm">Página {eventsPage} de {eventsTotalPages}</span>
              <button
                disabled={eventsPage >= eventsTotalPages}
                onClick={() => setEventsPage(eventsPage + 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
