"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Paintbrush, User, MapPin, ListTree, Images, Link as LinkIcon, LayoutGrid, ArrowUpDown, Search, Pencil, Check } from "lucide-react"
import EstiloSection from "./sections/EstiloSection"
import PerfilContatoSection from "./sections/PerfilContatoSection"
import EnderecoSection from "./sections/EnderecoSection"
import AreasServicosSection from "./sections/AreasServicosSection"
import GaleriaSection from "./sections/GaleriaSection"
import LinksSection from "./sections/LinksSection"
import SecoesExtrasSection from "./sections/SecoesExtrasSection"
import ReordenarSection from "./sections/ReordenarSection"
import SEOSection from "./sections/SEOSection"
import { useEditForm } from "./EditFormContext"
import { type BuiltInSectionKey, DEFAULT_SECTION_LABELS, DEFAULT_SECTION_ICONS, getSectionLabel, getSectionIcon } from "@/lib/section-order"
import { getIconComponent } from "@/lib/icon-renderer"
import { IconPicker } from "@/components/ui/icon-picker"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const sections: Record<string, {
  title: string
  icon: React.ElementType
  component: React.ComponentType
  publicSectionKeys?: BuiltInSectionKey[]
}> = {
  estilo: { title: "Estilo", icon: Paintbrush, component: EstiloSection },
  perfil: { title: "Perfil e Contato", icon: User, component: PerfilContatoSection },
  endereco: { title: "Endereço", icon: MapPin, component: EnderecoSection, publicSectionKeys: ["endereco"] },
  areas: { title: "Áreas ou serviços", icon: ListTree, component: AreasServicosSection, publicSectionKeys: ["servicos"] },
  galeria: { title: "Galeria", icon: Images, component: GaleriaSection, publicSectionKeys: ["galeria"] },
  links: { title: "Links", icon: LinkIcon, component: LinksSection, publicSectionKeys: ["links"] },
  "secoes-extras": { title: "Seções Extras", icon: LayoutGrid, component: SecoesExtrasSection },
  reordenar: { title: "Reordenar Seções", icon: ArrowUpDown, component: ReordenarSection },
  seo: { title: "SEO", icon: Search, component: SEOSection },
}

export function PublicSectionHeader({ sectionKey, inline }: { sectionKey: BuiltInSectionKey; inline?: boolean }) {
  const { sectionLabels, setSectionLabels, sectionIcons, setSectionIcons, updateSectionConfigMutation } = useEditForm()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const currentLabel = getSectionLabel(sectionKey, sectionLabels)
  const currentIconName = getSectionIcon(sectionKey, sectionIcons)
  const IconComp = getIconComponent(currentIconName)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEditing() {
    setDraft(currentLabel)
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setEditing(false)
      return
    }

    const newLabels = { ...sectionLabels } as Record<string, string>
    if (trimmed === DEFAULT_SECTION_LABELS[sectionKey]) {
      delete newLabels[sectionKey]
    } else {
      newLabels[sectionKey] = trimmed
    }

    setSectionLabels(newLabels)
    updateSectionConfigMutation.mutate({ sectionLabels: newLabels })
    setEditing(false)
  }

  function handleIconChange(iconName: string) {
    const newIcons = { ...sectionIcons }
    if (iconName === DEFAULT_SECTION_ICONS[sectionKey]) {
      delete newIcons[sectionKey]
    } else {
      newIcons[sectionKey] = iconName
    }

    setSectionIcons(newIcons)
    updateSectionConfigMutation.mutate({ sectionIcons: newIcons })
  }

  return (
    <div className={inline ? "mb-4 rounded-lg bg-muted/30 p-3" : "mb-6 rounded-lg border border-border bg-muted/30 p-3"}>
      <p className="text-xs text-muted-foreground mb-2">Título na página pública</p>
      <div className="flex items-center gap-2">
        <IconPicker value={currentIconName} onChange={handleIconChange}>
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          >
            {IconComp ? <IconComp className="w-4 h-4 text-muted-foreground" /> : null}
          </button>
        </IconPicker>

        {editing ? (
          <>
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save()
                if (e.key === "Escape") setEditing(false)
              }}
              onBlur={save}
              className="h-8 text-sm flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={save}
            >
              <Check className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium flex-1">{currentLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={startEditing}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SectionRenderer() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "estilo"
  const section = sections[tab] || sections.estilo
  const Icon = section.icon
  const Component = section.component

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{section.title}</h2>
      </div>

      {section.publicSectionKeys?.map((key) => (
        <PublicSectionHeader key={key} sectionKey={key} />
      ))}

      <Component />
    </div>
  )
}
