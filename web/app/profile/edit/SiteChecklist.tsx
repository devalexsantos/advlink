"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWatch } from "react-hook-form"
import { Check, ChevronDown, ChevronUp, Circle } from "lucide-react"
import { formatOab } from "@/lib/oab"
import { reviewText } from "@/lib/oab-review"
import { useEditForm } from "./EditFormContext"

const COLLAPSED_KEY = "advlink:site-checklist:collapsed"

type ChecklistItem = {
  key: string
  label: string
  hint?: string
  tab: string
  done: boolean
}

/** Rich-text fields hold HTML; "<p></p>" must count as empty. */
function plain(value: string | null | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim()
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0")
  } catch {
    // storage unavailable (private mode, blocked): the choice just isn't remembered
  }
}

/** "Seu site está X% pronto": completeness checklist of the active site, hidden at 100%. */
export default function SiteChecklist() {
  const { form, data, isLoading, isError, previewUrl, aboutMarkdown, areas, customSections, teamMembers } = useEditForm()
  const values = useWatch({ control: form.control })
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(readCollapsed())
  }, [])

  const items = useMemo<ChecklistItem[]>(() => {
    const v = values ?? {}
    const hasAddress = Boolean(v.street?.trim() || v.city?.trim() || v.zipCode?.trim())

    const advertisingIssues: { tab: string; text: string }[] = [
      { tab: "perfil", text: v.headline ?? "" },
      { tab: "perfil", text: aboutMarkdown },
      ...areas.flatMap((a) => [
        { tab: "areas", text: a.title },
        { tab: "areas", text: a.description ?? "" },
      ]),
      ...customSections.flatMap((s) => [
        { tab: "secoes-extras", text: s.title },
        { tab: "secoes-extras", text: s.description ?? "" },
      ]),
      { tab: "seo", text: v.metaTitle ?? "" },
      { tab: "seo", text: v.metaDescription ?? "" },
    ].filter((entry) => reviewText(entry.text).length > 0)

    const list: ChecklistItem[] = [
      { key: "photo", label: "Foto de perfil", tab: "estilo", done: Boolean(previewUrl) },
      {
        key: "oab",
        label: "Número da OAB preenchido",
        hint: "Exibido no seu site, conforme o Código de Ética da OAB.",
        tab: "perfil",
        done: formatOab(v.oabNumber, v.oabState) !== null,
      },
      { key: "about", label: "Texto “Sobre” preenchido", tab: "perfil", done: plain(aboutMarkdown).length > 0 },
      {
        key: "areas",
        label: "Ao menos uma área de atuação com descrição",
        tab: "areas",
        done: areas.some((a) => plain(a.description).length > 0),
      },
      {
        key: "contact",
        label: "WhatsApp ou telefone",
        tab: "perfil",
        done: Boolean(v.whatsapp?.trim() || v.publicPhone?.trim()),
      },
      { key: "address", label: "Endereço preenchido", tab: "endereco", done: hasAddress },
    ]
    if (v.practiceType === "escritorio") {
      list.push({ key: "team", label: "Ao menos um membro da equipe", tab: "equipe", done: teamMembers.length > 0 })
    }
    list.push({
      key: "advertising",
      label: "Textos sem alertas de publicidade OAB",
      hint: advertisingIssues.length > 0 ? "Há termos que merecem atenção (Provimento 205/2021). Veja os avisos nos campos." : undefined,
      tab: advertisingIssues[0]?.tab ?? "perfil",
      done: advertisingIssues.length === 0,
    })
    return list
  }, [values, aboutMarkdown, areas, customSections, teamMembers, previewUrl])

  if (isLoading || isError || !data) return null

  const doneCount = items.filter((i) => i.done).length
  const percent = Math.round((doneCount / items.length) * 100)
  if (percent >= 100) return null

  function toggle() {
    setCollapsed((prev) => {
      writeCollapsed(!prev)
      return !prev
    })
  }

  return (
    <section aria-labelledby="site-checklist-title" className="w-full max-w-4xl rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="site-checklist-title" className="text-base font-semibold text-foreground">
            Seu site está {percent}% pronto
          </h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} de {items.length} itens concluídos. Complete para passar mais confiança a quem visitar.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="site-checklist-items"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          {collapsed ? (
            <>
              Mostrar <ChevronDown className="h-4 w-4" />
            </>
          ) : (
            <>
              Ocultar <ChevronUp className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso do site"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      {!collapsed && (
        <ul id="site-checklist-items" className="mt-4 grid gap-1 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key}>
              {item.done ? (
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="line-through decoration-muted-foreground/40">{item.label}</span>
                  <span className="sr-only">(concluído)</span>
                </div>
              ) : (
                <Link
                  href={`/profile/edit?tab=${item.tab}`}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>
                    {item.label}
                    <span className="sr-only"> (pendente)</span>
                    {item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
