"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Key, Plus } from "lucide-react"

interface AdminRow {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count: { assignedTickets: number }
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "admin" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pwDialog, setPwDialog] = useState<{ id: string; name: string | null } | null>(null)
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" })
  const [pwError, setPwError] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  function fetchAdmins() {
    fetch("/api/admin/admins")
      .then((r) => r.json())
      .then(setAdmins)
  }

  useEffect(() => { fetchAdmins() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Erro ao criar admin")
      setLoading(false)
      return
    }

    setOpen(false)
    setForm({ email: "", name: "", password: "", role: "admin" })
    setLoading(false)
    fetchAdmins()
  }

  async function toggleActive(id: string, currentActive: boolean) {
    await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    })
    fetchAdmins()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")

    if (pwForm.password.length < 6) {
      setPwError("A senha deve ter no mínimo 6 caracteres")
      return
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwError("As senhas não coincidem")
      return
    }

    setPwLoading(true)
    const res = await fetch(`/api/admin/admins/${pwDialog!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwForm.password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setPwError(data.error || "Erro ao alterar senha")
      setPwLoading(false)
      return
    }

    setPwDialog(null)
    setPwForm({ password: "", confirm: "" })
    setPwLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administradores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Administrador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Administrador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tickets atribuídos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={a.role === "super_admin" ? "default" : "secondary"}>
                      {a.role === "super_admin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? "default" : "secondary"}>
                      {a.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a._count.assignedTickets}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPwDialog({ id: a.id, name: a.name })
                        setPwForm({ password: "", confirm: "" })
                        setPwError("")
                      }}
                    >
                      <Key className="h-4 w-4 mr-1" /> Alterar Senha
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(a.id, a.isActive)}
                    >
                      {a.isActive ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!pwDialog} onOpenChange={(v) => { if (!v) setPwDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha — {pwDialog?.name || "Admin"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={pwForm.password}
                onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                required
                minLength={6}
              />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <Button type="submit" className="w-full" disabled={pwLoading}>
              {pwLoading ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
