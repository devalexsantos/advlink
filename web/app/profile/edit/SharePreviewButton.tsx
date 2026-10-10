"use client"

import { useRef, useState } from "react"
import { Check, ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createPreviewLink, type PreviewLink } from "./api"

function formatDayMonth(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

/**
 * "Compartilhar prévia": generates the 7-day preview link, copies it to the clipboard
 * (falling back to a selectable input) and offers to open it in a new tab.
 */
export default function SharePreviewButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<PreviewLink | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleShare() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await createPreviewLink()
      setLink(result)
      let ok = false
      try {
        await navigator.clipboard.writeText(result.url)
        ok = true
      } catch {
        ok = false
      }
      setCopied(ok)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível gerar a prévia. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const until = link ? formatDayMonth(link.expiresAt) : ""

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" onClick={handleShare} disabled={loading} className="cursor-pointer gap-2 bg-transparent">
        <Share2 className="w-4 h-4" />
        {loading ? "Gerando link..." : link ? "Copiar link de novo" : "Compartilhar prévia"}
      </Button>
      <p className="mt-1 text-xs opacity-80">Mostre o site a alguém antes de publicar, sem precisar de login.</p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {link && (
        <div className="mt-2 space-y-2" aria-live="polite">
          {copied ? (
            <p className="inline-flex items-center gap-1 text-sm font-medium">
              <Check className="w-4 h-4" /> Link copiado.
            </p>
          ) : (
            <div>
              <label htmlFor="preview-link-url" className="block text-xs mb-1">
                Copie o link abaixo:
              </label>
              <input
                id="preview-link-url"
                ref={inputRef}
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
            </div>
          )}
          <p className="text-xs">
            {until ? `Link válido até ${until}. ` : ""}
            <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
              Abrir prévia <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
