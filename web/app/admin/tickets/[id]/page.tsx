"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Paperclip, X } from "lucide-react"

interface Message {
  id: string
  senderType: string
  message: string
  imageUrls?: string[] | null
  createdAt: string
  senderUser?: { name: string | null; email: string | null } | null
  senderAdmin?: { name: string | null; email: string | null } | null
}

interface Ticket {
  id: string
  number: number
  subject: string
  status: string
  priority: string
  category: string
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
  assignedAdmin: { id: string; name: string | null; email: string | null } | null
  messages: Message[]
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
}

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
}

const categoryLabels: Record<string, string> = {
  support: "Suporte",
  billing: "Cobrança",
  bug: "Bug",
  feature_request: "Sugestão",
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function fetchTicket() {
    fetch(`/api/admin/tickets/${id}`)
      .then((r) => r.json())
      .then(setTicket)
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

  async function handleSend() {
    if (!reply.trim() && files.length === 0) return
    setSending(true)
    const formData = new FormData()
    formData.append("message", reply)
    for (const file of files) {
      formData.append("images", file)
    }
    await fetch(`/api/admin/tickets/${id}/messages`, {
      method: "POST",
      body: formData,
    })
    setReply("")
    setFiles([])
    setSending(false)
    fetchTicket()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
    e.target.value = ""
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function updateTicket(field: string, value: string) {
    await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    fetchTicket()
  }

  if (!ticket) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  }

  const canSend = reply.trim() || files.length > 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        <span className="text-muted-foreground font-mono">#{ticket.number}</span>{" "}
        {ticket.subject}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Chat */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
              {ticket.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      m.senderType === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {m.senderType === "admin"
                        ? m.senderAdmin?.name || "Admin"
                        : m.senderUser?.name || m.senderUser?.email || "Usuário"}
                    </p>
                    {m.message && (
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    )}
                    {m.imageUrls && m.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(m.imageUrls as string[]).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="Anexo"
                            className="rounded-md max-h-48 max-w-full cursor-pointer object-cover"
                            onClick={() => window.open(url, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1 opacity-50">
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="space-y-2">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 rounded-md object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  placeholder="Escreva sua resposta..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend()
                  }}
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={handleSend} disabled={sending || !canSend} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Usuário</p>
                <p className="font-medium">{ticket.user.name || ticket.user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p>{new Date(ticket.createdAt).toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={ticket.status} onValueChange={(v) => updateTicket("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Prioridade</label>
                <Select value={ticket.priority} onValueChange={(v) => updateTicket("priority", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Select value={ticket.category} onValueChange={(v) => updateTicket("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
