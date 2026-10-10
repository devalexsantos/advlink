"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import { AlertTriangle, Check, Copy, Download, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatOab } from "@/lib/oab"
import { buildVCard } from "@/lib/vcard"

export type DivulgarSite = {
  name: string
  url: string
  oabNumber: string | null
  oabState: string | null
  phone: string | null
  email: string | null
  headline: string | null
  isActive: boolean
}

function download(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível: o texto continua visível para copiar à mão */
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  )
}

function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export default function DivulgarClient({ site }: { site: DivulgarSite }) {
  const [qrPng, setQrPng] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(site.url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then((d) => {
        if (!cancelled) setQrPng(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [site.url])

  async function downloadSvg() {
    const svg = await QRCode.toString(site.url, { type: "svg", margin: 2, errorCorrectionLevel: "M" })
    download(new Blob([svg], { type: "image/svg+xml" }), "qrcode-advlink.svg")
  }

  function downloadPng() {
    if (!qrPng) return
    const a = document.createElement("a")
    a.href = qrPng
    a.download = "qrcode-advlink.png"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function downloadVcf() {
    const vcf = buildVCard({
      name: site.name || "Advogado(a)",
      oabNumber: site.oabNumber,
      oabState: site.oabState,
      phone: site.phone,
      email: site.email,
      url: site.url,
    })
    download(new Blob([vcf], { type: "text/vcard;charset=utf-8" }), "contato.vcf")
  }

  const name = site.name || "Advogado(a)"
  const oab = formatOab(site.oabNumber, site.oabState)
  const host = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const headline = site.headline?.trim()

  const instagramBio = [
    `${name}${oab ? ` | ${oab}` : ""}`,
    headline || "Advocacia",
    `Conheça o site: ${site.url}`,
  ].join("\n")

  const emailSignature = [name, oab, host].filter(Boolean).join("\n")

  const whatsappStatus = `${name}${oab ? ` - ${oab}` : ""}. Informações sobre minha atuação profissional: ${site.url}`

  const linkedinSite = site.url

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Divulgar meu site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Materiais prontos para apresentar seu site de forma profissional.
        </p>
      </div>

      {!site.isActive && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            Seu site ainda não está publicado. O QR code e os textos já usam o endereço definitivo, que passa a
            funcionar após a publicação.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/profile/edit">Ir para o editor</Link>
          </Button>
        </div>
      )}

      <div
        role="note"
        className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p>
          Não envie o link em massa para desconhecidos nem em listas compradas (Prov. OAB 205/2021). Compartilhe
          com sua rede e nos seus perfis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QR code do site</CardTitle>
          <CardDescription>
            Use no cartão de visitas, na placa do escritório ou em materiais impressos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-2">
            {qrPng ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrPng} alt={`QR code para ${host}`} className="h-full w-full" />
            ) : (
              <span className="text-xs text-muted-foreground">Gerando...</span>
            )}
          </div>
          <div className="w-full space-y-3">
            <p className="break-all text-sm text-muted-foreground">{host}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={downloadPng} disabled={!qrPng}>
                <Download className="h-4 w-4" />
                Baixar PNG
              </Button>
              <Button type="button" variant="outline" onClick={downloadSvg}>
                <Download className="h-4 w-4" />
                Baixar SVG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cartão digital</CardTitle>
          <CardDescription>
            Um arquivo de contato para quem quiser salvar seus dados na agenda do celular.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={downloadVcf}>
            <Download className="h-4 w-4" />
            Baixar contato (.vcf)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Textos prontos</CardTitle>
          <CardDescription>
            Textos informativos e sóbrios, adequados às regras de publicidade da advocacia. Revise antes de usar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextCard title="Bio do Instagram" text={instagramBio} />
          <TextCard title="Assinatura de e-mail" text={emailSignature} />
          <TextCard title="Status do WhatsApp" text={whatsappStatus} />
          <TextCard title="Campo “site” do LinkedIn" text={linkedinSite} />

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Perfil da Empresa no Google</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Acesse business.google.com e crie ou reivindique o perfil do seu escritório.</li>
              <li>Preencha nome, endereço e telefone e confirme a propriedade pelo método indicado pelo Google.</li>
              <li>
                No campo de site, informe <span className="break-all font-medium text-foreground">{site.url}</span>
              </li>
              <li>Escolha a categoria “Advogado” e salve.</li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Mantenha nome, endereço e telefone exatamente iguais aos do seu site.
            </p>
            <div className="mt-3">
              <CopyButton text={site.url} />
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Quer um endereço só seu?{" "}
        <Link href="/profile/dominio" className="font-medium text-foreground underline underline-offset-4">
          Conectar domínio próprio
        </Link>
      </p>
    </div>
  )
}
