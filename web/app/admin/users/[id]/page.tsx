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

interface UserDetail {
  id: string
  name: string | null
  email: string | null
  isActive: boolean
  stripeCustomerId: string | null
  createdAt: string
  profile: {
    id: string
    slug: string | null
    publicName: string | null
    theme: string | null
    createdAt: string
  } | null
  activityAreas: { id: string; title: string }[]
  Links: { id: string; title: string; url: string }[]
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={user.isActive ? "default" : "secondary"}>
              {user.isActive ? "Ativo" : "Inativo"}
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

      {user.profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><strong>Slug:</strong> {user.profile.slug || "—"}</p>
            <p><strong>Nome público:</strong> {user.profile.publicName || "—"}</p>
            <p><strong>Tema:</strong> {user.profile.theme || "—"}</p>
            <p><strong>Criado em:</strong> {new Date(user.profile.createdAt).toLocaleDateString("pt-BR")}</p>
            <Link href={`/admin/sites/${user.profile.id}`} className="text-primary hover:underline text-sm">
              Ver detalhes do site
            </Link>
          </CardContent>
        </Card>
      )}

      {user.activityAreas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Áreas de atuação</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.activityAreas.map((a) => (
                <Badge key={a.id} variant="outline">{a.title}</Badge>
              ))}
            </div>
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
