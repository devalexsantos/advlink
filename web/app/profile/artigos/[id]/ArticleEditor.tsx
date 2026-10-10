"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink, ImagePlus, Info, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { OabWarnings } from "@/components/oab-warnings"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  coverImageUrl: string | null
  status: "draft" | "published"
  publishedAt: string | null
  metaDescription: string | null
  updatedAt: string
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const EXCERPT_MAX = 300
const META_MAX = 160

async function fetchArticle(id: string): Promise<{ article: Article }> {
  const res = await fetch(`/api/articles/${id}`)
  if (!res.ok) throw new Error("Artigo não encontrado.")
  return res.json()
}

export default function ArticleEditor({ id, siteUrl }: { id: string; siteUrl: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["article", id],
    queryFn: () => fetchArticle(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Carregando artigo...</p>
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6">
        <p role="alert" className="text-sm text-destructive">Artigo não encontrado.</p>
        <Button asChild variant="outline"><Link href="/profile/artigos">Voltar para artigos</Link></Button>
      </div>
    )
  }
  return <EditorForm key={data.article.id} initial={data.article} siteUrl={siteUrl} />
}

function EditorForm({ initial, siteUrl }: { initial: Article; siteUrl: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [article, setArticle] = useState<Article>(initial)
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "")
  const [content, setContent] = useState(initial.content ?? "")
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription ?? "")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(initial.coverImageUrl)
  const [removeCover, setRemoveCover] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiTitle, setAiTitle] = useState("")
  const [aiNotes, setAiNotes] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ content: string; excerpt: string } | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)

  const published = article.status === "published"
  const slugInvalid = slug.length > 0 && !SLUG_RE.test(slug)

  function onCover(file: File | null) {
    if (!file) return
    setCoverFile(file)
    setRemoveCover(false)
    if (typeof URL !== "undefined" && URL.createObjectURL) setCoverPreview(URL.createObjectURL(file))
  }

  function clearCover() {
    setCoverFile(null)
    setCoverPreview(null)
    setRemoveCover(true)
  }

  async function send(extra: Record<string, unknown>, okMessage: string) {
    setError(null)
    setNotice(null)
    if (!title.trim()) return setError("Informe o título do artigo.")
    if (slugInvalid || !slug) return setError("O endereço (URL) deve usar apenas letras minúsculas, números e hífens.")
    setBusy(true)
    try {
      const fields = { title: title.trim(), slug, excerpt, content, metaDescription, ...extra }
      let res: Response
      if (coverFile || removeCover) {
        const fd = new FormData()
        for (const [k, v] of Object.entries(fields)) fd.set(k, String(v))
        if (coverFile) fd.set("cover", coverFile)
        if (removeCover) fd.set("removeCover", "true")
        res = await fetch(`/api/articles/${article.id}`, { method: "PATCH", body: fd })
      } else {
        res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        })
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || "Não foi possível salvar o artigo.")
        return
      }
      const saved: Article = body.article
      setArticle(saved)
      setSlug(saved.slug)
      setCoverFile(null)
      setRemoveCover(false)
      setCoverPreview(saved.coverImageUrl)
      setReviewed(false)
      setNotice(okMessage)
      qc.invalidateQueries({ queryKey: ["articles"] })
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    setAiError(null)
    if (!aiTitle.trim()) return setAiError("Informe o tema ou título do artigo.")
    setAiLoading(true)
    try {
      const res = await fetch("/api/articles/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: aiTitle.trim(), notes: aiNotes.trim() || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiError(body?.error || "Não foi possível gerar o rascunho.")
        return
      }
      const result = { content: String(body.content ?? ""), excerpt: String(body.excerpt ?? "") }
      if (content.replace(/<[^>]*>/g, "").trim()) {
        setAiResult(result)
      } else {
        applyDraft(result)
      }
    } catch {
      setAiError("Erro de conexão. Tente novamente.")
    } finally {
      setAiLoading(false)
    }
  }

  function applyDraft(r: { content: string; excerpt: string }) {
    setContent(r.content)
    if (r.excerpt) setExcerpt(r.excerpt.slice(0, EXCERPT_MAX))
    setAiResult(null)
    setAiOpen(false)
    setNotice("Rascunho gerado. Revise e ajuste o texto antes de publicar.")
  }

  async function remove() {
    setDeleteOpen(false)
    setBusy(true)
    const res = await fetch(`/api/articles/${article.id}`, { method: "DELETE" }).catch(() => null)
    setBusy(false)
    if (!res || !res.ok) return setError("Não foi possível excluir o artigo.")
    qc.invalidateQueries({ queryKey: ["articles"] })
    router.push("/profile/artigos")
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/profile/artigos"><ArrowLeft className="mr-1 h-4 w-4" aria-hidden />Artigos</Link>
        </Button>
        <div className="flex items-center gap-2">
          {published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Rascunho</Badge>}
          {published && (
            <Button asChild variant="ghost" size="sm">
              <a href={`${siteUrl}artigos/${article.slug}`} target="_blank" rel="noopener noreferrer">
                Ver no site<ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Artigos devem ter caráter informativo (Provimento 205/2021, art. 4º): explique temas jurídicos de forma geral.
          Não cite casos concretos, não prometa resultados, não divulgue preços nem use expressões de captação de clientela.
        </p>
      </div>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="art-title">Título</Label>
          <Input id="art-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="art-slug">Endereço do artigo (URL)</Label>
          <Input
            id="art-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            aria-invalid={slugInvalid}
          />
          <p className="break-all text-xs text-muted-foreground">
            {siteUrl}artigos/{slug || "..."}
          </p>
          {slugInvalid && (
            <p role="alert" className="text-xs text-destructive">
              Use apenas letras minúsculas, números e hífens (sem espaços ou acentos).
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="art-cover">Imagem de capa</Label>
          {coverPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Capa do artigo" className="aspect-[16/9] w-full max-w-sm rounded-xl border border-border object-cover" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <label htmlFor="art-cover" className="cursor-pointer">
                <ImagePlus className="mr-1 h-4 w-4" aria-hidden />
                {coverPreview ? "Trocar imagem" : "Enviar imagem"}
              </label>
            </Button>
            {coverPreview && (
              <Button type="button" variant="ghost" size="sm" onClick={clearCover}>Remover imagem</Button>
            )}
          </div>
          <input
            id="art-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onCover(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="art-excerpt">Resumo</Label>
          <Textarea
            id="art-excerpt"
            rows={3}
            maxLength={EXCERPT_MAX}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">{excerpt.length}/{EXCERPT_MAX}</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>Conteúdo</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAiTitle(title)
                setAiError(null)
                setAiResult(null)
                setAiOpen(true)
              }}
            >
              <Sparkles className="mr-1 h-4 w-4" aria-hidden />
              Gerar rascunho com IA
            </Button>
          </div>
          <RichTextEditor
            content={content}
            onChange={setContent}
            minHeight="400px"
            placeholder="Escreva o artigo aqui..."
          />
          <OabWarnings text={`${title} ${content}`} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="art-meta">Descrição para o Google</Label>
          <Textarea
            id="art-meta"
            rows={2}
            maxLength={META_MAX}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">{metaDescription.length}/{META_MAX}</p>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          <span>
            Revisei o conteúdo e ele segue o Provimento 205/2021 (informativo, sem casos concretos, promessas ou preços)
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {/* A published article only changes through "Atualizar publicação" (requires the review checkbox) */}
          {!published && (
            <Button variant="outline" disabled={busy} onClick={() => send({}, "Rascunho salvo.")}>
              Salvar rascunho
            </Button>
          )}
          {published ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => send({ status: "draft" }, "Artigo despublicado.")}
            >
              Despublicar
            </Button>
          ) : null}
          <Button
            disabled={busy || !reviewed}
            onClick={() => send({ status: "published", reviewed: true }, "Artigo publicado.")}
          >
            {published ? "Atualizar publicação" : "Publicar"}
          </Button>
          <Button variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" aria-hidden />
            Excluir
          </Button>
        </div>
      </section>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar rascunho com IA</DialogTitle>
            <DialogDescription>
              A IA cria um texto informativo inicial. Você deve revisar e ajustar tudo antes de publicar.
            </DialogDescription>
          </DialogHeader>
          {aiResult ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                O artigo já tem conteúdo. Substituir o texto atual pelo rascunho gerado?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiResult(null)}>Manter o meu texto</Button>
                <Button onClick={() => applyDraft(aiResult)}>Substituir conteúdo</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-title">Tema ou título</Label>
                <Input id="ai-title" value={aiTitle} maxLength={150} onChange={(e) => setAiTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-notes">Observações (opcional)</Label>
                <Textarea
                  id="ai-notes"
                  rows={3}
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="Pontos que o artigo deve abordar"
                />
              </div>
              {aiError && <p role="alert" className="text-sm text-destructive">{aiError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiOpen(false)}>Cancelar</Button>
                <Button onClick={generate} disabled={aiLoading}>
                  {aiLoading ? "Gerando..." : "Gerar rascunho"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir artigo?</DialogTitle>
            <DialogDescription>O artigo será apagado de forma permanente e sairá do seu site.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={remove}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
