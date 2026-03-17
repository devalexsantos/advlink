"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, ImageIcon, AlignLeft, Video, MousePointerClick, Ban, Eye, EyeOff, ArrowUpDown } from "lucide-react"
import { icons } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconPicker } from "@/components/ui/icon-picker"
import { useEditForm } from "../EditFormContext"
import type { CustomSectionItem } from "../types"
import { getVideoEmbedUrl } from "@/lib/video-embed"

const LAYOUTS = [
  { value: "image-left", label: "Imagem à esquerda", icon: "◧", hint: "Imagem ao lado do texto" },
  { value: "image-right", label: "Imagem à direita", icon: "◨", hint: "Texto ao lado da imagem" },
  { value: "text-only", label: "Somente texto", icon: "☰", hint: "Texto livre com formatação" },
  { value: "video", label: "Vídeo", icon: "video", hint: "YouTube ou Vimeo" },
  { value: "button", label: "Botão / Link", icon: "button", hint: "Botão clicável com link" },
] as const

type LayoutValue = (typeof LAYOUTS)[number]["value"]

const LAYOUT_LABELS: Record<string, string> = {
  "image-left": "Img esquerda",
  "image-right": "Img direita",
  "text-only": "Texto",
  "video": "Vídeo",
  "button": "Botão",
}

function getSectionDisplayName(section: CustomSectionItem): string {
  if (section.layout === "button") {
    return section.buttonConfig?.label || section.title
  }
  return section.title
}

export default function SecoesExtrasSection() {
  const {
    customSections,
    createCustomSectionMutation,
    patchCustomSectionMutation,
    deleteCustomSectionMutation,
    sectionTitleHidden,
    setSectionTitleHidden,
    updateSectionConfigMutation,
    showToast,
  } = useEditForm()

  const router = useRouter()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<CustomSectionItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<CustomSectionItem | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [layout, setLayout] = useState<LayoutValue>("text-only")
  const [iconName, setIconName] = useState("FileText")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  // Video state
  const [videoUrl, setVideoUrl] = useState("")

  // Section header visibility
  const [hideTitle, setHideTitle] = useState(false)

  // Button state
  const [buttonUrl, setButtonUrl] = useState("")
  const [buttonLabel, setButtonLabel] = useState("")
  const [buttonBgColor, setButtonBgColor] = useState("#000000")
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF")
  const [buttonRadius, setButtonRadius] = useState(8)
  const [buttonIconName, setButtonIconName] = useState("")

  function resetForm() {
    setTitle("")
    setDescription("")
    setLayout("text-only")
    setIconName("FileText")
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setEditingSection(null)
    setVideoUrl("")
    setButtonUrl("")
    setButtonLabel("")
    setButtonBgColor("#000000")
    setButtonTextColor("#FFFFFF")
    setButtonRadius(8)
    setButtonIconName("")
    setHideTitle(false)
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(section: CustomSectionItem) {
    setEditingSection(section)
    setTitle(section.title)
    setDescription(section.description || "")
    setLayout(section.layout)
    setIconName(section.iconName)
    setImageFile(null)
    setImagePreview(section.imageUrl)
    setRemoveImage(false)
    setVideoUrl(section.videoUrl || "")
    setButtonUrl(section.buttonConfig?.url || "")
    setButtonLabel(section.buttonConfig?.label || "")
    setButtonBgColor(section.buttonConfig?.bgColor || "#000000")
    setButtonTextColor(section.buttonConfig?.textColor || "#FFFFFF")
    setButtonRadius(section.buttonConfig?.borderRadius ?? 8)
    setButtonIconName(section.buttonConfig?.iconName || "")
    setHideTitle(sectionTitleHidden[`custom_${section.id}`] === true)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (layout !== "button" && !title.trim()) {
      showToast("Informe um título para a seção.")
      return
    }

    const fd = new FormData()
    // For button layout, use a generic title (the label lives in buttonConfig)
    const effectiveTitle = layout === "button" ? (title.trim() || "Botão") : title.trim()
    fd.set("title", effectiveTitle)
    fd.set("description", description)
    fd.set("layout", layout)
    fd.set("iconName", layout === "button" ? "" : iconName)
    if (imageFile) fd.set("image", imageFile)
    if (removeImage) fd.set("removeImage", "true")
    if (layout === "video") fd.set("videoUrl", videoUrl)
    if (layout === "button") {
      fd.set("buttonConfig", JSON.stringify({
        url: buttonUrl,
        label: buttonLabel,
        bgColor: buttonBgColor,
        textColor: buttonTextColor,
        borderRadius: buttonRadius,
        iconName: buttonIconName || undefined,
      }))
    }

    try {
      if (editingSection) {
        await patchCustomSectionMutation.mutateAsync({ id: editingSection.id, formData: fd })
        // Persist title hidden state
        const key = `custom_${editingSection.id}`
        const currentlyHidden = sectionTitleHidden[key] === true
        if (hideTitle !== currentlyHidden) {
          const updated = { ...sectionTitleHidden, [key]: hideTitle }
          if (!updated[key]) delete updated[key]
          setSectionTitleHidden(updated)
          await updateSectionConfigMutation.mutateAsync({ sectionTitleHidden: updated })
        }
        showToast("Seção atualizada!")
      } else {
        const result = await createCustomSectionMutation.mutateAsync(fd)
        // Persist title hidden state for new section
        if (hideTitle && result?.section?.id) {
          const key = `custom_${result.section.id}`
          const updated = { ...sectionTitleHidden, [key]: true }
          setSectionTitleHidden(updated)
          await updateSectionConfigMutation.mutateAsync({ sectionTitleHidden: updated })
        }
        showToast("Seção criada!")
      }
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar seção."
      showToast(message)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      await deleteCustomSectionMutation.mutateAsync(deleteConfirm.id)
      showToast("Seção excluída!")
      setDeleteConfirm(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir seção."
      showToast(message)
    }
  }

  const showImageField = layout === "image-left" || layout === "image-right"
  const showDescriptionField = layout !== "button"
  const isSaving = createCustomSectionMutation.isPending || patchCustomSectionMutation.isPending

  const deleteDisplayName = deleteConfirm
    ? (deleteConfirm.layout === "button"
      ? (deleteConfirm.buttonConfig?.label || deleteConfirm.title)
      : deleteConfirm.title)
    : ""

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Crie seções personalizadas para sua página pública com texto e imagens.
      </p>

      {/* Empty state */}
      {customSections.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Nenhuma seção extra criada ainda.</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span>Texto com imagem</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlignLeft className="h-4 w-4 shrink-0" />
              <span>Somente texto</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Video className="h-4 w-4 shrink-0" />
              <span>Vídeo</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MousePointerClick className="h-4 w-4 shrink-0" />
              <span>Botão / Link</span>
            </div>
          </div>
        </div>
      )}

      {/* List of existing sections */}
      {customSections.length > 0 && (
        <div className="space-y-2">
          {customSections.map((section) => {
            const listIconName = section.layout === "button" ? (section.buttonConfig?.iconName || "") : section.iconName
            const ListIcon = listIconName ? (icons as Record<string, React.ElementType>)[listIconName] : null
            const displayName = getSectionDisplayName(section)
            return (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3"
              >
                {ListIcon ? <ListIcon className="h-4 w-4 text-muted-foreground shrink-0" /> : <MousePointerClick className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="flex-1 truncate text-sm font-medium">{displayName}</span>
                <Badge variant="secondary" className="text-xs">
                  {LAYOUT_LABELS[section.layout] || section.layout}
                </Badge>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => openEdit(section)}
                  aria-label={`Editar ${displayName}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => setDeleteConfirm(section)}
                  aria-label={`Excluir ${displayName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Button type="button" variant="outline" className="gap-2" onClick={openCreate}>
        <Plus className="h-4 w-4" /> Criar Seção
      </Button>

      {/* Reorder link */}
      {customSections.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
          Para mudar a ordem, acesse{" "}
          <button
            type="button"
            className="underline hover:text-foreground cursor-pointer transition-colors"
            onClick={() => router.push("/profile/edit?tab=reordenar")}
          >
            Reordenar Seções
          </button>
        </p>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm() } else setDialogOpen(true) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingSection ? "Editar Seção" : "Nova Seção"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Layout selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Layout</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors cursor-pointer ${
                      layout === l.value ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                    }`}
                    onClick={() => {
                      setLayout(l.value)
                      if (l.value === "button") setHideTitle(true)
                    }}
                  >
                    {l.value === "text-only" ? (
                      <AlignLeft className="h-6 w-6 text-muted-foreground" />
                    ) : l.value === "video" ? (
                      <Video className="h-6 w-6 text-muted-foreground" />
                    ) : l.value === "button" ? (
                      <MousePointerClick className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <div className="flex gap-1 h-6 items-center">
                        {l.value === "image-left" && <><ImageIcon className="h-5 w-5 text-muted-foreground" /><AlignLeft className="h-4 w-4 text-muted-foreground" /></>}
                        {l.value === "image-right" && <><AlignLeft className="h-4 w-4 text-muted-foreground" /><ImageIcon className="h-5 w-5 text-muted-foreground" /></>}
                      </div>
                    )}
                    <span>{l.label}</span>
                    <span className="text-[10px] text-muted-foreground">{l.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title + visibility toggle */}
            {layout !== "button" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Título</label>
                  <button
                    type="button"
                    className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                      hideTitle ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setHideTitle(!hideTitle)}
                  >
                    {hideTitle ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {hideTitle ? "Título oculto" : "Título visível"}
                  </button>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nosso Escritório"
                  disabled={hideTitle}
                  className={hideTitle ? "opacity-50" : ""}
                />
                {hideTitle && (
                  <p className="text-xs text-amber-600 mt-1">Este título não será exibido na página pública.</p>
                )}
              </div>
            )}

            {/* Description (hidden for button layout) */}
            {showDescriptionField && (
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <RichTextEditor
                  content={description}
                  onChange={(html) => setDescription(html)}
                  placeholder="Escreva o conteúdo da seção..."
                  minHeight="150px"
                />
              </div>
            )}

            {/* Video URL */}
            {layout === "video" && (
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block">URL do vídeo</label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                />
                {videoUrl && (() => {
                  const embed = getVideoEmbedUrl(videoUrl)
                  if (!embed) return <p className="text-xs text-destructive">URL inválida. Use YouTube ou Vimeo.</p>
                  return (
                    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                      <iframe
                        src={embed.embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Preview"
                      />
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Button config */}
            {layout === "button" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">URL do botão</label>
                  <Input
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Texto do botão</label>
                  <Input
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    placeholder="Ex: Agende uma consulta"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cor de fundo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonBgColor}
                        onChange={(e) => setButtonBgColor(e.target.value)}
                        className="h-9 w-12 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={buttonBgColor}
                        onChange={(e) => setButtonBgColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cor do texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={buttonTextColor}
                        onChange={(e) => setButtonTextColor(e.target.value)}
                        className="h-9 w-12 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={buttonTextColor}
                        onChange={(e) => setButtonTextColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Arredondamento: {buttonRadius}px
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={buttonRadius}
                    onChange={(e) => setButtonRadius(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                {/* Button icon */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Ícone do botão</label>
                  <IconPicker value={buttonIconName} onChange={setButtonIconName}>
                    <Button type="button" variant="outline" className="gap-2">
                      {(() => {
                        const BtnIcon = buttonIconName ? (icons as Record<string, React.ElementType>)[buttonIconName] : null
                        return BtnIcon ? <BtnIcon className="h-4 w-4" /> : <Ban className="h-4 w-4 text-muted-foreground" />
                      })()}
                      {buttonIconName || "Nenhum"}
                    </Button>
                  </IconPicker>
                </div>
                {/* Button preview */}
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <span
                    style={{
                      backgroundColor: buttonBgColor,
                      color: buttonTextColor,
                      borderRadius: `${buttonRadius}px`,
                      padding: "12px 36px",
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}
                    className="inline-flex items-center gap-2"
                  >
                    {(() => {
                      const BtnIcon = buttonIconName ? (icons as Record<string, React.ElementType>)[buttonIconName] : null
                      return BtnIcon ? <BtnIcon className="h-5 w-5" /> : null
                    })()}
                    {buttonLabel || "Clique aqui"}
                  </span>
                </div>
              </div>
            )}

            {/* Image upload (if layout requires it) */}
            {showImageField && (
              <div>
                <label className="text-sm font-medium mb-1 block">Imagem</label>
                {imagePreview && !removeImage && (
                  <div className="relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => { setRemoveImage(true); setImageFile(null); setImagePreview(null) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setImageFile(file)
                      setImagePreview(URL.createObjectURL(file))
                      setRemoveImage(false)
                    }
                  }}
                />
              </div>
            )}

            {/* Icon (hidden for button layout — buttons don't have section headers) */}
            {layout !== "button" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Ícone da seção</label>
                <IconPicker value={iconName} onChange={setIconName}>
                  <Button type="button" variant="outline" className="gap-2">
                    {(() => {
                      const Icon = iconName ? (icons as Record<string, React.ElementType>)[iconName] : null
                      return Icon ? <Icon className="h-4 w-4" /> : <Ban className="h-4 w-4 text-muted-foreground" />
                    })()}
                    {iconName || "Nenhum"}
                  </Button>
                </IconPicker>
                {!iconName && <p className="text-xs text-muted-foreground mt-1">Ícone oculto na página pública</p>}
              </div>
            )}
          </div>

          {/* Fixed save button */}
          <div className="pt-4 border-t border-border shrink-0">
            <Button
              type="button"
              className="w-full"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : editingSection ? "Salvar" : "Criar Seção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir seção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a seção &quot;{deleteDisplayName}&quot;? Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCustomSectionMutation.isPending}
            >
              {deleteCustomSectionMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
