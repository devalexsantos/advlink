"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Badge } from "@/components/ui/badge"

interface AuditLogRow {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  adminUser: { name: string | null; email: string }
  beforeJson: unknown
  afterJson: unknown
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [entityType, setEntityType] = useState("all")
  const [action, setAction] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams()
    if (entityType !== "all") params.set("entityType", entityType)
    if (action) params.set("action", action)
    params.set("page", String(page))

    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      })
  }, [entityType, action, page])

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log de Auditoria ({total})</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="User">Usuário</SelectItem>
            <SelectItem value="Profile">Site</SelectItem>
            <SelectItem value="AdminUser">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por ação..."
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="w-48"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>ID da Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">
                    {new Date(l.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.adminUser.name || l.adminUser.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.entityType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                    {l.entityId.slice(0, 12)}...
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado
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
