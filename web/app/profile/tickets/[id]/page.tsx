"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

interface Message {
  id: string
  senderType: string
  message: string
  createdAt: string
  senderUser?: { name: string | null; email: string | null } | null
  senderAdmin?: { name: string | null } | null
}

interface Ticket {
  id: string
  number: number
  subject: string
  status: string
  category: string
  createdAt: string
  messages: Message[]
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando resposta",
  resolved: "Resolvido",
  closed: "Fechado",
}

export default function UserTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  function fetchTicket() {
    fetch(`/api/tickets/${id}`)
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
    if (!reply.trim()) return
    setSending(true)
    await fetch(`/api/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    })
    setReply("")
    setSending(false)
    fetchTicket()
  }

  if (!ticket) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  }

  const isClosed = ticket.status === "closed"

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          <span className="text-muted-foreground font-mono">#{ticket.number}</span>{" "}
          {ticket.subject}
        </h1>
        <Badge variant="outline">{statusLabels[ticket.status] || ticket.status}</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderType === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    m.senderType === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {m.senderType === "admin" ? m.senderAdmin?.name || "Suporte" : "Você"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  <p className="text-[10px] mt-1 opacity-50">
                    {new Date(m.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {!isClosed ? (
            <div className="flex gap-2">
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
              <Button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Este ticket está fechado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
