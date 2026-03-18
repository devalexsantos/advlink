"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ProfileSummary {
  id: string
  name: string | null
  slug: string | null
  publicName: string | null
  isActive: boolean
  theme: string | null
  createdAt: string
  activityAreas: { id: string; title: string }[]
  links: { id: string; title: string; url: string }[]
}

interface UserDetail {
  id: string
  name: string | null
  email: string | null
  isActive: boolean
  stripeCustomerId: string | null
  createdAt: string
  profiles: ProfileSummary[]
  tickets: { id: string; subject: string; status: string; createdAt: string }[]
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [toggling, setToggling] = useState(false)

  function fetchUser() {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then(setUser)
  }

  useEffect(() => { fetchUser() }, [id])

  async function toggleActive() {
    if (!user) return
    setToggling(true)
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    fetchUser()
    setToggling(false)
  }

  if (!user) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant={user.isActive ? "destructive" : "default"}
          onClick={toggleActive}
          disabled={toggling}
        >
          {user.isActive ? "Bloquear" : "Desbloquear"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conta</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={user.isActive ? "default" : "secondary"}>
              {user.isActive ? "Ativa" : "Bloqueada"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Plano</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{user.stripeCustomerId ? "Pago" : "Free"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cadastro</CardTitle></CardHeader>
          <CardContent>
            <p>{new Date(user.createdAt).toLocaleDateString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      {user.profiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites ({user.profiles.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name || p.publicName || "—"}</TableCell>
                    <TableCell className="text-sm">{p.slug || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/sites/${p.id}`} className="text-primary hover:underline text-sm">
                        Ver site
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {user.tickets.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tickets</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/tickets/${t.id}`} className="hover:underline">
                        {t.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
