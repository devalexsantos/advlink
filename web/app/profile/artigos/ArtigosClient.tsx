"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ExternalLink, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ArticleListItem = {
  id: string
  slug: string
  title: string
  status: "draft" | "published"
  excerpt: string | null
  coverImageUrl: string | null
  publishedAt: string | null
  updatedAt: string
}

async function fetchArticles(): Promise<{ articles: ArticleListItem[] }> {
  const res = await fetch("/api/articles")
  if (!res.ok) throw new Error("Não foi possível carregar os artigos.")
  return res.json()
}

async function createArticle(title: string): Promise<{ article: { id: string } }> {
  const res = await fetch("/api/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Não foi possível criar o artigo.")
  return data
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

export default function ArtigosClient({ siteUrl }: { siteUrl: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const { data, isLoading, isError } = useQuery({ queryKey: ["articles"], queryFn: fetchArticles })

  const create = useMutation({
    mutationFn: createArticle,
    onSuccess: ({ article }) => router.push(`/profile/artigos/${article.id}`),
  })

  const articles = data?.articles ?? []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Artigos</h1>
          <p className="text-sm text-muted-foreground">
            Publique conteúdo informativo no seu site e seja encontrado no Google.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Novo artigo
        </Button>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando artigos...</p>}
      {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os artigos.</p>}

      {!isLoading && !isError && articles.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Nenhum artigo ainda</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Crie seu primeiro artigo. Você pode começar de um rascunho gerado por IA e revisar antes de publicar.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {articles.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 space-y-1">
              <Link href={`/profile/artigos/${a.id}`} className="block truncate font-semibold text-foreground hover:underline">
                {a.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {a.status === "published" ? <Badge>Publicado</Badge> : <Badge variant="secondary">Rascunho</Badge>}
                <span>Atualizado em {formatDate(a.updatedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.status === "published" && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`${siteUrl}artigos/${a.slug}`} target="_blank" rel="noopener noreferrer">
                    Ver no site
                    <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/profile/artigos/${a.id}`}>Editar</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (title.trim()) create.mutate(title.trim())
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Novo artigo</DialogTitle>
              <DialogDescription>Escolha um título. Você poderá alterá-lo depois.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="new-article-title">Título</Label>
              <Input
                id="new-article-title"
                value={title}
                maxLength={150}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Como funciona a guarda compartilhada"
              />
            </div>
            {create.isError && (
              <p role="alert" className="text-sm text-destructive">{(create.error as Error).message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={!title.trim() || create.isPending}>Criar artigo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
