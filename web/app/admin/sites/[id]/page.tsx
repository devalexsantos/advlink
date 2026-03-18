"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  user: {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
    stripeCustomerId: string | null
  }
}

export default function AdminSiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [toggling, setToggling] = useState(false)

  function fetchSite() {
    fetch(`/api/admin/sites/${id}`)
      .then((r) => r.json())
      .then(setSite)
  }

  useEffect(() => { fetchSite() }, [id])

  async function toggleSuspend() {
    if (!site) return
    setToggling(true)
    await fetch(`/api/admin/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !site.isActive }),
    })
    fetchSite()
    setToggling(false)
  }

  if (!site) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{site.publicName || site.slug || "Site"}</h1>
          <p className="text-muted-foreground">{site.slug}.advlink.site</p>
        </div>
        <Button
          variant={site.isActive ? "destructive" : "default"}
          onClick={toggleSuspend}
          disabled={toggling}
        >
          {site.isActive ? "Suspender" : "Reativar"}
        </Button>
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
            <p><strong>Stripe:</strong> {site.user.stripeCustomerId ? "Sim" : "Não"}</p>
            <Link href={`/admin/users/${site.user.id}`} className="text-primary hover:underline">
              Ver perfil do usuário
            </Link>
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
