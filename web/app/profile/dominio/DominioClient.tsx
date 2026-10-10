"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, ExternalLink, Globe, Info, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DomainStatus = "pending_dns" | "provisioning" | "active" | "error"

type CustomDomain = {
  host: string
  status: DomainStatus
  txtName: string
  txtValue: string
  targetIp: string
  error: string | null
  activatedAt: string | null
  lastCheckedAt: string | null
}

type DomainResponse = { domain: CustomDomain | null; configured: boolean }

const STATUS_LABEL: Record<DomainStatus, string> = {
  pending_dns: "Aguardando DNS",
  provisioning: "Emitindo certificado",
  active: "Ativo",
  error: "Erro",
}

const STATUS_CLASS: Record<DomainStatus, string> = {
  pending_dns: "border-amber-500/40 bg-amber-500/10 text-foreground",
  provisioning: "border-sky-500/40 bg-sky-500/10 text-foreground",
  active: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
}

// Sufixos de dois níveis comuns no Brasil: com 3 rótulos (ex.: escritorio.adv.br) o domínio ainda é "raiz".
const BR_SECOND_LEVEL = new Set(["adv", "com", "net", "org", "eco", "edu", "blog", "app"])

/** Nome do registro A: "@" para domínio raiz; o próprio host quando for subdomínio (ex.: www.exemplo.com.br). */
export function aRecordName(host: string): { name: string; isSubdomain: boolean } {
  const labels = host.split(".")
  const isBr = labels[labels.length - 1] === "br"
  const rootLabels = isBr && BR_SECOND_LEVEL.has(labels[labels.length - 2] ?? "") ? 3 : 2
  if (labels.length <= rootLabels) return { name: "@", isSubdomain: false }
  return { name: host, isSubdomain: true }
}

async function fetchDomain(): Promise<DomainResponse> {
  const res = await fetch("/api/custom-domain")
  if (!res.ok) throw new Error("Não foi possível carregar o domínio. Tente novamente.")
  return res.json()
}

async function request(url: string, init: RequestInit): Promise<{ domain?: CustomDomain }> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Não foi possível concluir. Tente novamente.")
  return data
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível: o texto continua visível */
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={`Copiar ${label}`}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-sm text-foreground">{value}</p>
      </div>
      <div className="shrink-0">
        <CopyButton text={value} label={label} />
      </div>
    </div>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  )
}

export default function DominioClient() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["custom-domain"], queryFn: fetchDomain })
  const [host, setHost] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const setDomain = (domain: CustomDomain | null) =>
    qc.setQueryData<DomainResponse>(["custom-domain"], (old) => ({
      configured: old?.configured ?? true,
      domain,
    }))

  const connect = useMutation({
    mutationFn: (h: string) =>
      request("/api/custom-domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: h }),
      }),
    onSuccess: (r) => {
      if (r.domain) setDomain(r.domain)
      setHost("")
    },
  })

  const verify = useMutation({
    mutationFn: () => request("/api/custom-domain/verify", { method: "POST" }),
    onSuccess: (r) => {
      if (r.domain) setDomain(r.domain)
    },
  })

  const remove = useMutation({
    mutationFn: () => request("/api/custom-domain", { method: "DELETE" }),
    onSuccess: () => {
      setDomain(null)
      setConfirmOpen(false)
      verify.reset()
      connect.reset()
    },
  })

  const domain = data?.domain ?? null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Domínio próprio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use um endereço só seu, como escritorio.adv.br, no lugar do endereço padrão do AdvLink.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {isError && <ErrorText>{(error as Error).message}</ErrorText>}

      {data && !data.configured && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          Domínio próprio estará disponível em breve.
        </div>
      )}

      {data?.configured && !domain && (
        <Card>
          <CardHeader>
            <CardTitle>Conecte o seu domínio</CardTitle>
            <CardDescription>Passe a divulgar um endereço fácil de lembrar e com a cara do seu escritório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Endereço próprio, como escritorio.adv.br ou www.seuescritorio.com.br.</li>
              <li>
                A categoria .adv.br é reservada pelo Registro.br para advogados, o que reforça a credibilidade do seu
                site.
              </li>
              <li>
                Você continua com o endereço gratuito seu-site.advlink.site, que passa a redirecionar para o novo
                domínio.
              </li>
            </ul>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (host.trim()) connect.mutate(host.trim())
              }}
            >
              <Label htmlFor="dominio-host">Seu domínio</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="dominio-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="escritorio.adv.br"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <Button type="submit" disabled={connect.isPending || !host.trim()}>
                  {connect.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Conectar
                </Button>
              </div>
              {connect.isError && <ErrorText>{(connect.error as Error).message}</ErrorText>}
            </form>
          </CardContent>
        </Card>
      )}

      {data?.configured && domain && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 break-all">
                  <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
                  {domain.host}
                </CardTitle>
                <Badge variant="outline" className={STATUS_CLASS[domain.status]}>
                  {STATUS_LABEL[domain.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {domain.status === "active" ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Seu site está no ar no seu domínio. O endereço do AdvLink agora redireciona para ele.
                  </p>
                  <Button asChild>
                    <a href={`https://${domain.host}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir https://{domain.host}
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Faça os ajustes abaixo no painel onde você registrou o domínio (Registro.br, GoDaddy, Cloudflare etc.)
                  e clique em “Verificar agora”.
                </p>
              )}

              {domain.status === "error" && domain.error && <ErrorText>{domain.error}</ErrorText>}
              {verify.isError && <ErrorText>{(verify.error as Error).message}</ErrorText>}
              {verify.isSuccess && domain.status !== "active" && domain.error && (
                <p role="status" className="text-sm text-foreground">
                  {domain.error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {domain.status !== "active" && (
                  <Button type="button" onClick={() => verify.mutate()} disabled={verify.isPending}>
                    {verify.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verificar agora
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
                  Remover domínio
                </Button>
              </div>
              {remove.isError && <ErrorText>{(remove.error as Error).message}</ErrorText>}
            </CardContent>
          </Card>

          {domain.status !== "active" && <DnsInstructions domain={domain} />}
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover domínio?</DialogTitle>
            <DialogDescription>
              {domain?.host} deixará de abrir o seu site. O endereço do AdvLink continua funcionando normalmente.
            </DialogDescription>
          </DialogHeader>
          {remove.isError && <ErrorText>{(remove.error as Error).message}</ErrorText>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DnsInstructions({ domain }: { domain: CustomDomain }) {
  const a = aRecordName(domain.host)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Como configurar o DNS</CardTitle>
        <CardDescription>Crie os dois registros abaixo na zona DNS do seu domínio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">1. Registro do tipo A</h3>
          <Field label="Nome" value={a.name} />
          {a.isSubdomain && (
            <p className="text-xs text-muted-foreground">
              Como {domain.host} é um subdomínio, use a parte inicial (ex.: “www”) como nome se o seu provedor
              completar o domínio automaticamente.
            </p>
          )}
          <Field label="Valor" value={domain.targetIp} />
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">2. Registro do tipo TXT</h3>
          <Field label="Nome" value={domain.txtName} />
          <Field label="Valor" value={domain.txtValue} />
          <p className="text-xs text-muted-foreground">Este registro confirma que o domínio é seu.</p>
        </div>

        <div role="note" className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p>Se usar Cloudflare no seu domínio, deixe o registro A como “Somente DNS” (nuvem cinza).</p>
            <p className="text-muted-foreground">
              A propagação do DNS pode levar até 24 horas. Você pode sair desta página e voltar depois.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
