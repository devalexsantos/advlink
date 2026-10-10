"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Inbox, Mail, MessageCircle, Phone, Trash2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildWhatsAppUrl } from "@/lib/whatsapp"

export type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  areaTitle: string | null
  message: string
  createdAt: string
  readAt: string | null
}

type LeadsResponse = { leads: Lead[]; unread: number }

async function fetchLeads(): Promise<LeadsResponse> {
  const res = await fetch("/api/leads")
  if (!res.ok) throw new Error("Não foi possível carregar as mensagens.")
  return res.json()
}

async function setRead(id: string, read: boolean) {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read }),
  })
  if (!res.ok) throw new Error("Não foi possível atualizar a mensagem.")
}

async function removeLead(id: string) {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Não foi possível excluir a mensagem.")
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export default function ContatosClient() {
  const qc = useQueryClient()
  const [toDelete, setToDelete] = useState<Lead | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads })

  const readMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => setRead(id, read),
    onSuccess: () => {
      setActionError(null)
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLead(id),
    onSuccess: () => {
      setActionError(null)
      setToDelete(null)
      qc.invalidateQueries({ queryKey: ["leads"] })
    },
    onError: (e: Error) => {
      setToDelete(null)
      setActionError(e.message)
    },
  })

  const leads = data?.leads ?? []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mensagens do site</h1>
        <p className="text-sm text-muted-foreground">
          Contatos enviados pelo formulário do seu site.
          {data && data.unread > 0 && (
            <span className="ml-1 font-medium text-foreground">
              {data.unread} {data.unread === 1 ? "não lida" : "não lidas"}.
            </span>
          )}
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>As mensagens são apagadas automaticamente após 90 dias (LGPD).</p>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando mensagens...</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">Não foi possível carregar as mensagens.</p>
      )}

      {!isLoading && !isError && leads.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Nenhuma mensagem ainda</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Ative o formulário em Editor → Perfil e contato para receber mensagens de visitantes do seu site.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/profile/edit?tab=perfil">Ir para Perfil e contato</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {leads.map((lead) => {
          const unread = !lead.readAt
          return (
            <li
              key={lead.id}
              data-testid={`lead-${lead.id}`}
              data-unread={unread}
              className={
                "rounded-2xl border p-4 sm:p-5 " +
                (unread ? "border-primary/40 bg-primary/5" : "border-border bg-card")
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <span className="truncate">{lead.name}</span>
                    {unread && <Badge>Nova</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</p>
                </div>
                {lead.areaTitle && <Badge variant="outline">{lead.areaTitle}</Badge>}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:underline">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <>
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:underline">
                      <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
                      {lead.phone}
                    </a>
                    <a
                      href={buildWhatsAppUrl(lead.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:underline"
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                      WhatsApp
                    </a>
                  </>
                )}
              </div>

              <p className="mt-3 whitespace-pre-line rounded-lg bg-background/60 text-sm text-foreground">{lead.message}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={readMutation.isPending}
                  onClick={() => readMutation.mutate({ id: lead.id, read: unread })}
                >
                  {unread ? "Marcar como lida" : "Marcar como não lida"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(lead)}>
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                  Excluir
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir mensagem?</DialogTitle>
            <DialogDescription>
              A mensagem de {toDelete?.name} será apagada de forma permanente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
