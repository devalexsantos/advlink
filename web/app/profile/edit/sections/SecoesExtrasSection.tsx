"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, ImageIcon, AlignLeft } from "lucide-react"
import { icons } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconPicker } from "@/components/ui/icon-picker"
import { useEditForm } from "../EditFormContext"
import type { CustomSectionItem } from "../types"

const LAYOUTS = [
  { value: "image-left", label: "Imagem à esquerda", icon: "◧" },
  { value: "image-right", label: "Imagem à direita", icon: "◨" },
  { value: "text-only", label: "Somente texto", icon: "☰" },
] as const

type LayoutValue = (typeof LAYOUTS)[number]["value"]

const LAYOUT_LABELS: Record<string, string> = {
  "image-left": "Img esquerda",
  "image-right": "Img direita",
  "text-only": "Texto",
}

export default function SecoesExtrasSection() {
  const {
    customSections,
    createCustomSectionMutation,
    patchCustomSectionMutation,
    deleteCustomSectionMutation,
    showToast,
  } = useEditForm()

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

  function resetForm() {
    setTitle("")
    setDescription("")
    setLayout("text-only")
    setIconName("FileText")
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setEditingSection(null)
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
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast("Informe um título para a seção.")
      return
    }

    const fd = new FormData()
    fd.set("title", title.trim())
    fd.set("description", description)
    fd.set("layout", layout)
    fd.set("iconName", iconName)
    if (imageFile) fd.set("image", imageFile)
    if (removeImage) fd.set("removeImage", "true")

    try {
      if (editingSection) {
        await patchCustomSectionMutation.mutateAsync({ id: editingSection.id, formData: fd })
        showToast("Seção atualizada!")
      } else {
        await createCustomSectionMutation.mutateAsync(fd)
        showToast("Seção criada!")
      }
      setDialogOpen(false)
      resetForm()
    } catch {
      showToast("Erro ao salvar seção.")
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      await deleteCustomSectionMutation.mutateAsync(deleteConfirm.id)
      showToast("Seção excluída!")
      setDeleteConfirm(null)
    } catch {
      showToast("Erro ao excluir seção.")
    }
  }

  const showImageField = layout !== "text-only"
  const isSaving = createCustomSectionMutation.isPending || patchCustomSectionMutation.isPending

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Crie seções personalizadas para sua página pública com texto e imagens.
      </p>

      {/* List of existing sections */}
      {customSections.length > 0 && (
        <div className="space-y-2">
          {customSections.map((section) => {
            const Icon = (icons as Record<string, React.ElementType>)[section.iconName] ?? (icons as Record<string, React.ElementType>)["FileText"]
            return (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{section.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {LAYOUT_LABELS[section.layout] || section.layout}
                </Badge>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => openEdit(section)}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => setDeleteConfirm(section)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); resetForm() } else setDialogOpen(true) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Editar Seção" : "Nova Seção"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Layout selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Layout</label>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors cursor-pointer ${
                      layout === l.value ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
                    }`}
                    onClick={() => setLayout(l.value)}
                  >
                    {l.value === "text-only" ? (
                      <AlignLeft className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <div className="flex gap-1 h-6 items-center">
                        {l.value === "image-left" && <><ImageIcon className="h-5 w-5 text-muted-foreground" /><AlignLeft className="h-4 w-4 text-muted-foreground" /></>}
                        {l.value === "image-right" && <><AlignLeft className="h-4 w-4 text-muted-foreground" /><ImageIcon className="h-5 w-5 text-muted-foreground" /></>}
                      </div>
                    )}
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nosso Escritório"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <RichTextEditor
                content={description}
                onChange={(html) => setDescription(html)}
                placeholder="Escreva o conteúdo da seção..."
                minHeight="150px"
              />
            </div>

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

            {/* Icon */}
            <div>
              <label className="text-sm font-medium mb-1 block">Ícone</label>
              <IconPicker value={iconName} onChange={setIconName}>
                <Button type="button" variant="outline" className="gap-2">
                  {(() => {
                    const Icon = (icons as Record<string, React.ElementType>)[iconName]
                    return Icon ? <Icon className="h-4 w-4" /> : null
                  })()}
                  {iconName}
                </Button>
              </IconPicker>
            </div>

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
            Tem certeza que deseja excluir a seção &quot;{deleteConfirm?.title}&quot;? Essa ação não pode ser desfeita.
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
