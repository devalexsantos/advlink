"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getRootDomain } from "@/lib/site-url"

type Props = {
  effectiveSlug: string
  label?: string
  className?: string
}

/** "Alterar link" button + dialog to validate and save the profile's public slug. */
export default function ChangeSlugButton({ effectiveSlug, label = "Alterar link", className }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [slugInput, setSlugInput] = useState<string>("")
  const [initialSlug, setInitialSlug] = useState<string>("")
  const [slugValid, setSlugValid] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState<boolean>(false)

  const [slugError, setSlugError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function validateSlug(slugToCheck: string) {
    const res = await fetch("/api/profile/validate-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugToCheck })
    })
    if (!res.ok) throw new Error("Slug inválido")
    return res.json() as Promise<{ valid: boolean; slug: string; error?: string }>
  }

  const saveSlugMutation = useMutation({
    mutationFn: async (nextSlug: string) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: nextSlug })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(res.status < 500 && data?.error ? data.error : "Não foi possível salvar o link. Tente novamente.")
      }
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
    },
    onError: (err) => setSaveError(err instanceof Error ? err.message : "Não foi possível salvar o link."),
  })

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={className ?? "ml-2 cursor-pointer mt-2 md:mt-0 border border-purple-400 bg-purple-600 text-white hover:bg-purple-500"}
        onClick={() => {
          setSlugInput(effectiveSlug)
          setInitialSlug(effectiveSlug)
          setSlugValid(null)
          setOpen(true)
        }}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="w-full max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Alterar meu link</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar modal"
            className="cursor-pointer absolute right-3 top-3 z-20 rounded-full bg-zinc-50 text-foreground p-2 shadow-md border border-border hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-3 text-foreground">
            <div>
              <Label htmlFor="slug" className="mb-2 block font-bold">Link público</Label>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex w-full items-center overflow-hidden rounded-md border border-border bg-card">
                  <input
                    id="slug"
                    value={slugInput}
                    onChange={(e) => { setSlugInput(e.target.value); setSlugValid(null); setSlugError(null) }}
                    placeholder="seu-link"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none px-3 py-2"
                  />
                  <span className="pl-1 pr-3 py-2 text-sm text-foreground font-bold whitespace-nowrap select-none">.{getRootDomain()}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full md:w-auto cursor-pointer"
                  disabled={slugChecking || slugInput.trim().length === 0 || slugInput === initialSlug}
                  onClick={async () => {
                    setSlugChecking(true)
                    setSlugError(null)
                    try {
                      const res = await validateSlug(slugInput)
                      setSlugInput(res.slug)
                      setSlugValid(Boolean(res.valid))
                      if (!res.valid && res.error === "reserved") {
                        setSlugError("reserved")
                      }
                      if (res.valid) {
                      }
                    } finally {
                      setSlugChecking(false)
                    }
                  }}
                >
                  {slugChecking ? "Verificando..." : "Validar"}
                </Button>
              </div>
              {slugValid === false && slugError === "reserved" && (<p className="mt-1 text-sm text-red-400">Este link é reservado pelo sistema. Escolha outro.</p>)}
              {slugValid === false && slugError !== "reserved" && (<p className="mt-1 text-sm text-red-400">Este slug já existe. Escolha outro.</p>)}
              {slugValid === true && (<p className="mt-1 text-sm text-green-700">Link disponível! Salve para aplicar.</p>)}
            </div>
          </div>

          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              className="w-full cursor-pointer"
              onClick={async () => {
                setSaveError(null)
                const next = (slugInput || "").trim()
                if (!next) return
                if (next !== initialSlug && slugValid !== true) return
                await saveSlugMutation.mutateAsync(next).catch(() => {})
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
