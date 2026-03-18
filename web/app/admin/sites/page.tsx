"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SiteRow {
  id: string
  slug: string | null
  publicName: string | null
  name: string | null
  isActive: boolean
  theme: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
  }
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("page", String(page))

    fetch(`/api/admin/sites?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites || [])
        setTotal(data.total || 0)
      })
  }, [search, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sites ({total})</h1>

      <Input
        placeholder="Buscar por slug ou nome..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="w-64"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/admin/sites/${s.id}`} className="font-medium hover:underline">
                      {s.slug || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{s.publicName || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Link href={`/admin/users/${s.user.id}`} className="hover:underline">
                      {s.user.name || s.user.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.theme || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {sites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum site encontrado
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
