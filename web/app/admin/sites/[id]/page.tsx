"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getProfileHost } from "@/lib/site-url"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  billingStatusLabel,
  billingStatusVariant,
  billingTypeLabel,
  cycleLabel,
  formatCents,
  formatSubscriptionValue,
  formatCivilDate,
  paymentStatusLabel,
  subscriptionStatusLabel,
} from "@/app/admin/_lib/billing-labels"

interface SiteDetail {
  id: string
  slug: string | null
  publicName: string | null
  name: string | null
  isActive: boolean
  headline: string | null
  avatarUrl: string | null
  coverUrl: string | null
  whatsapp: string | null
  publicEmail: string | null
  publicPhone: string | null
  theme: string | null
  primaryColor: string
  secondaryColor: string
  metaTitle: string | null
  metaDescription: string | null
  createdAt: string
  updatedAt: string
  billingStatus: string
  paidUntil: string | null
  graceUntil: string | null
  suspendedByAdmin: boolean
  churnedAt: string | null
  user: {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
  }
  billingSubscriptions: {
    status: string
    valueCents: number
    cycle?: string | null
    billingType: string | null
    nextDueDate: string | null
    canceledAt: string | null
    cancelReason: string | null
  }[]
  billingPayments: {
    id: string
    status: string
    valueCents: number
    billingType: string
    dueDate: string
    paymentDate: string | null
    revoked: boolean
    invoiceUrl: string | null
  }[]
}

export default function AdminSiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fetchSite() {
    fetch(`/api/admin/sites/${id}`)
      .then((r) => r.json())
      .then(setSite)
  }

  useEffect(() => { fetchSite() }, [id])

  // Legacy sites (no Asaas billing) unpublished by the old admin toggle count as suspended too
  const suspended = site ? site.suspendedByAdmin || (site.billingStatus === "NONE" && !site.isActive) : false

  async function toggleSuspend() {
    if (!site) return
    setToggling(true)
    setError(null)
    const res = await fetch(`/api/admin/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !suspended }),
    })
    if (!res.ok) setError("Não foi possível alterar o site. Tente novamente.")
    fetchSite()
    setToggling(false)
  }

  if (!site) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  const subscription = site.billingSubscriptions[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{site.publicName || site.slug || "Site"}</h1>
          <p className="text-muted-foreground">{site.slug ? getProfileHost(site.slug) : "—"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={site.isActive ? "default" : "secondary"}>
              {site.isActive ? "Publicado" : "Fora do ar"}
            </Badge>
            {site.suspendedByAdmin && <Badge variant="destructive">Suspenso pela equipe</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant={suspended ? "default" : "destructive"}
            onClick={toggleSuspend}
            disabled={toggling}
          >
            {suspended ? "Reativar" : "Suspender"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Informações do Site</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Slug:</strong> {site.slug || "—"}</p>
            <p><strong>Headline:</strong> {site.headline || "—"}</p>
            <p><strong>Tema:</strong> {site.theme || "—"}</p>
            <p><strong>Cor primária:</strong> <span style={{ color: site.primaryColor }}>{site.primaryColor}</span></p>
            <p><strong>WhatsApp:</strong> {site.whatsapp || "—"}</p>
            <p><strong>Email público:</strong> {site.publicEmail || "—"}</p>
            <p><strong>Criado:</strong> {new Date(site.createdAt).toLocaleDateString("pt-BR")}</p>
            <p><strong>Atualizado:</strong> {new Date(site.updatedAt).toLocaleDateString("pt-BR")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Owner</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Nome:</strong> {site.user.name || "—"}</p>
            <p><strong>Email:</strong> {site.user.email || "—"}</p>
            <p>
              <strong>Conta:</strong>{" "}
              <Badge variant={site.user.isActive ? "default" : "secondary"}>
                {site.user.isActive ? "Ativa" : "Bloqueada"}
              </Badge>
            </p>
            <Link href={`/admin/users/${site.user.id}`} className="text-primary hover:underline">
              Ver perfil do usuário
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Cobrança</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Status:</strong>{" "}
              <Badge variant={billingStatusVariant(site.billingStatus)}>
                {billingStatusLabel(site.billingStatus)}
              </Badge>
              {site.billingStatus === "NONE" && site.isActive && (
                <span className="ml-2 text-muted-foreground">(publicado antes do Asaas)</span>
              )}
            </p>
            <p><strong>Pago até:</strong> {formatCivilDate(site.paidUntil)}</p>
            {site.graceUntil && site.billingStatus === "GRACE" && (
              <p><strong>Carência até:</strong> {formatCivilDate(site.graceUntil)}</p>
            )}
            {subscription ? (
              <>
                <p>
                  <strong>Assinatura:</strong> {subscriptionStatusLabel(subscription.status)} ·{" "}
                  {cycleLabel(subscription.cycle)} · {formatSubscriptionValue(subscription.valueCents, subscription.cycle)} ·{" "}
                  {billingTypeLabel(subscription.billingType)}
                </p>
                {subscription.status === "ACTIVE" && (
                  <p><strong>Próxima cobrança:</strong> {formatCivilDate(subscription.nextDueDate)}</p>
                )}
                {subscription.canceledAt && (
                  <p>
                    <strong>Encerrada em:</strong> {new Date(subscription.canceledAt).toLocaleDateString("pt-BR")}
                    {subscription.cancelReason && ` · ${subscription.cancelReason}`}
                  </p>
                )}
              </>
            ) : (
              <p><strong>Assinatura:</strong> nenhuma</p>
            )}
            {site.billingPayments.length > 0 && (
              <div className="pt-2">
                <p className="font-medium">Últimas cobranças</p>
                <ul className="mt-1 space-y-1">
                  {site.billingPayments.map((p) => (
                    <li key={p.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                      <span>Venc. {formatCivilDate(p.dueDate)}</span>
                      <span>{formatCents(p.valueCents)}</span>
                      <span>{billingTypeLabel(p.billingType)}</span>
                      <span>{p.revoked ? "Revogada" : paymentStatusLabel(p.status)}</span>
                      {p.paymentDate && <span>pago em {formatCivilDate(p.paymentDate)}</span>}
                      {p.invoiceUrl && (
                        <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          fatura
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {site.metaTitle && (
        <Card>
          <CardHeader><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><strong>Meta título:</strong> {site.metaTitle}</p>
            <p><strong>Meta descrição:</strong> {site.metaDescription || "—"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
