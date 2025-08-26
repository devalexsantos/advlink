"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink, X } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Props = {
  slug?: string | null
}

export default function PublishedCTA({ slug }: Props) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { cache: "no-store" })
      if (!res.ok) throw new Error("Falha ao carregar perfil")
      return res.json() as Promise<{ profile: { slug?: string | null } | null }>
    },
  })

  const effectiveSlug = data?.profile?.slug ?? slug ?? ""
  const hasSlug = effectiveSlug.trim().length > 0
  const href = hasSlug ? `https://${effectiveSlug}.advlink.site` : undefined

  const [open, setOpen] = useState(false)
  const [slugInput, setSlugInput] = useState<string>("")
  const [initialSlug, setInitialSlug] = useState<string>("")
  const [slugValid, setSlugValid] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState<boolean>(false)

  async function validateSlug(slugToCheck: string) {
    const res = await fetch("/api/profile/validate-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugToCheck })
    })
    if (!res.ok) throw new Error("Slug inválido")
    return res.json() as Promise<{ valid: boolean; slug: string }>
  }

  const saveSlugMutation = useMutation({
    mutationFn: async (nextSlug: string) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: nextSlug })
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      return res.json() as Promise<{ profile?: { slug?: string | null } }>
    },
    onSuccess: async (res) => {
      qc.setQueryData(["profile"], (old: unknown) => {
        const next = (res as { profile?: Record<string, unknown> } | null) || null
        if (!old) return next
        const oldObj = old as { profile?: Record<string, unknown> }
        return { ...oldObj, profile: { ...(oldObj.profile || {}), ...(next?.profile || {}) } }
      })
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
      setOpen(false)
    }
  })

  return (
    <>
      <div className="w-full max-w-4xl mb-4 rounded-xl border bg-opacity-10 p-4 md:p-5 border-lime-500/60 bg-lime-500/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <CheckCircle2 className="w-6 h-6 text-lime-400" />
            </div>
            <p className="text-sm md:text-base text-lime-100/90">
              <span className="font-semibold text-lime-200">Seu site está publicado!</span>{" "}
              {hasSlug ? (
                <>
                  O seu link é:{" "}
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-lime-400 underline-offset-4 hover:text-white"
                  >
                    {href}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              ) : (
                <>
                  Defina um link público (slug) na seção de Estilo para divulgar sua página.
                </>
              )}
              {" "}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="ml-2 cursor-pointer mt-2 md:mt-0"
                onClick={() => {
                  setSlugInput(effectiveSlug)
                  setInitialSlug(effectiveSlug)
                  setSlugValid(null)
                  setOpen(true)
                }}
              >
                Alterar link
              </Button>
            </p>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="w-full max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Alterar meu link</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar modal"
            className="cursor-pointer absolute right-3 top-3 z-20 rounded-full bg-zinc-50 text-zinc-900 p-2 shadow-md border border-zinc-300 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-3 text-zinc-200">
            <div>
              <Label htmlFor="slug" className="mb-2 block font-bold">Link público</Label>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex w-full items-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
                  <input
                    id="slug"
                    value={slugInput}
                    onChange={(e) => { setSlugInput(e.target.value); setSlugValid(null) }}
                    placeholder="seu-link"
                    className="flex-1 bg-transparent text-sm text-zinc-100 outline-none px-3 py-2"
                  />
                  <span className="pl-1 pr-3 py-2 text-sm text-zinc-100 font-bold whitespace-nowrap select-none">.advlink.site</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full md:w-auto cursor-pointer"
                  disabled={slugChecking || slugInput.trim().length === 0 || slugInput === initialSlug}
                  onClick={async () => {
                    setSlugChecking(true)
                    try {
                      const res = await validateSlug(slugInput)
                      setSlugInput(res.slug)
                      setSlugValid(Boolean(res.valid))
                      if (res.valid) {
                        const url = `https://${res.slug}.advlink.site`
                        window.open(url, "_blank")
                      }
                    } finally {
                      setSlugChecking(false)
                    }
                  }}
                >
                  {slugChecking ? "Verificando..." : "Validar"}
                </Button>
              </div>
              {slugValid === false && (<p className="mt-1 text-sm text-red-400">Este slug já existe. Escolha outro.</p>)}
              {slugValid === true && (<p className="mt-1 text-sm text-green-400">Link disponível! Salve para aplicar.</p>)}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              className="w-full cursor-pointer"
              onClick={async () => {
                const next = (slugInput || "").trim()
                if (!next) return
                if (next !== initialSlug && slugValid !== true) return
                await saveSlugMutation.mutateAsync(next)
              }}
              disabled={saveSlugMutation.isPending || (slugInput.trim().length === 0) || (slugInput !== initialSlug && slugValid !== true)}
            >
              {saveSlugMutation.isPending ? "Salvando..." : slugValid === true ? "Salvar" : "Valide antes de continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


