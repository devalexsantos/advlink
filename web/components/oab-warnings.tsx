"use client"

import { useMemo } from "react"
import { TriangleAlert } from "lucide-react"
import { reviewText } from "@/lib/oab-review"
import { cn } from "@/lib/utils"

export function OabWarnings({ text, className }: { text?: string; className?: string }) {
  const findings = useMemo(() => reviewText(text ?? ""), [text])

  if (findings.length === 0) return null

  return (
    <div
      role="status"
      className={cn(
        "mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <ul className="space-y-1">
          {findings.map((f) => (
            <li key={`${f.rule}|${f.term}`}>
              <span className="font-medium">“{f.term}”</span>: {f.message}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[11px] opacity-80">
        Verificação automática e orientativa. Não substitui a análise da seccional da OAB.
      </p>
    </div>
  )
}
