import { prisma } from "@/lib/prisma"
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
import {
  Users,
  UserPlus,
  Globe,
  MessageSquare,
  CreditCard,
  XCircle,
  GlobeLock,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
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

export default async function AdminDashboardPage() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalSites,
    publishedSites,
    openTickets,
    activeSubscriptions,
    recentCancellations,
    latestUsers,
    latestSites,
    recentTickets,
    unansweredTickets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.profile.count(),
    prisma.profile.count({ where: { user: { isActive: true } } }),
    prisma.ticket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.user.count({ where: { isActive: true, stripeCustomerId: { not: null } } }),
    prisma.user.count({
      where: { isActive: false, stripeCustomerId: { not: null }, updatedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, isActive: true },
    }),
    prisma.profile.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.ticket.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.ticket.findMany({
      where: {
        status: "open",
        messages: { none: { senderType: "admin" } },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  const stats = [
    { label: "Total de usuários", value: totalUsers, icon: Users },
    { label: "Novos (7d)", value: newUsers7d, icon: UserPlus },
    { label: "Novos (30d)", value: newUsers30d, icon: CalendarDays },
    { label: "Total de sites", value: totalSites, icon: Globe },
    { label: "Sites publicados", value: publishedSites, icon: GlobeLock },
    { label: "Tickets abertos", value: openTickets, icon: MessageSquare },
    { label: "Assinaturas ativas", value: activeSubscriptions, icon: CreditCard },
    { label: "Cancelamentos recentes", value: recentCancellations, icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
                {latestUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/admin/users/${u.id}`} className="hover:underline font-medium">
                        {u.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {latestUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum usuário
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
                {latestSites.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/admin/sites/${p.id}`} className="hover:underline font-medium">
                        {p.slug || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.user.name || p.user.email}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(p.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {latestSites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum site
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
                {recentTickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/tickets/${t.id}`} className="hover:underline font-medium">
                        <span className="text-muted-foreground font-mono">#{t.number}</span>{" "}
                        {t.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.user.name || t.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[t.status] as "destructive" | "default" | "secondary" | "outline"}>
                        {statusLabels[t.status] || t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {recentTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum ticket
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
                {unansweredTickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/tickets/${t.id}`} className="hover:underline font-medium">
                        <span className="text-muted-foreground font-mono">#{t.number}</span>{" "}
                        {t.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.user.name || t.user.email}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {unansweredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum ticket sem resposta
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
