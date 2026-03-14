"use client"

import { useState } from "react"
import { GripVertical, Pencil, Plus, Save, Trash2, Upload, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEditForm } from "../EditFormContext"
import { useQueryClient } from "@tanstack/react-query"
import type { Area } from "../types"

function SortableAreaItem({ area, onEdit, onDelete }: { area: Area; onEdit: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: area.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 ${isDragging ? "opacity-30" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm">{area.title}</span>
      <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 cursor-pointer" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editar</span>
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function AreaOverlay({ area }: { area: Area }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary bg-card px-3 py-2.5 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate text-sm">{area.title}</span>
    </div>
  )
}

export default function AreasServicosSection() {
  const {
    areas, setAreas,
    editingArea, setEditingArea,
    areaCoverFile, setAreaCoverFile,
    areaCoverPreview, setAreaCoverPreview,
    areaCoverGenerating,
    removeAreaCover, setRemoveAreaCover,
    areaSaving, setAreaSaving,
    editorMarkdown, setEditorMarkdown,
    draftMdRef,
    deleteConfirm, setDeleteConfirm,
    createAreaMutation,
    patchAreaMutation,
    reorderMutation,
    deleteMutation,
    showToast,
  } = useEditForm()

  const qc = useQueryClient()
  const [activeArea, setActiveArea] = useState<Area | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const item = areas.find((a) => a.id === event.active.id)
    setActiveArea(item ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveArea(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = areas.findIndex((a) => a.id === active.id)
    const newIndex = areas.findIndex((a) => a.id === over.id)
    const next = arrayMove(areas, oldIndex, newIndex)
    setAreas(next)
    const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
    try { await reorderMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar") }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">Suas áreas</Label>
          <Button type="button" variant="default" size="sm" className="gap-2 cursor-pointer" onClick={() => createAreaMutation.mutate()}>
            <Plus className="w-4 h-4" /> Nova área
          </Button>
        </div>

        {areas.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Arraste pelo ícone <GripVertical className="inline h-3.5 w-3.5" /> para reordenar</span>
          </div>
        )}

        <DndContext id="reordenar-areas" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={areas.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {areas.map((a) => (
                <SortableAreaItem
                  key={a.id}
                  area={a}
                  onEdit={() => { setEditingArea(a); setRemoveAreaCover(false) }}
                  onDelete={() => setDeleteConfirm(a)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeArea && <AreaOverlay area={activeArea} />}</DragOverlay>
        </DndContext>

        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma área cadastrada</p>
        )}
      </div>

      {/* Edit area dialog */}
      <Dialog open={!!editingArea} onOpenChange={(v) => !v && (setEditingArea(null), setRemoveAreaCover(false), setAreaCoverPreview(null))}>
        <DialogContent className="w-full max-w-6xl h-screen md:h-auto overflow-auto">
          <DialogHeader>
            <DialogTitle>Editar área</DialogTitle>
          </DialogHeader>
          <button type="button" onClick={() => setEditingArea(null)} aria-label="Fechar modal"
            className="absolute right-3 top-3 z-20 rounded-full bg-background text-foreground p-2 shadow-md border border-border hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
          {editingArea && (
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Título</Label>
                <Input value={editingArea.title} onChange={(e) => setEditingArea({ ...editingArea, title: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Label className="mb-2 block">Capa da área</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-40 w-40 overflow-hidden rounded-md ring-2 ring-border">
                    {areaCoverGenerating ? (
                      <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground text-center px-2">Estamos gerando sua capa com iA…</div>
                    ) : (areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={areaCoverPreview || (editingArea.coverImageUrl as string)} alt="Capa da área" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">Capa</div>
                    )}
                    {!areaCoverGenerating && (areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) && (
                      <button type="button" className="absolute right-1 top-1 z-10 rounded-full border border-border bg-background/80 p-1 text-foreground shadow-md backdrop-blur hover:bg-muted"
                        onClick={() => { setAreaCoverFile(null); setAreaCoverPreview(null); setRemoveAreaCover(true) }} aria-label="Remover capa">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                    <Upload className="h-4 w-4" /><span>Enviar capa</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return
                      setAreaCoverFile(f); setRemoveAreaCover(false)
                      const url = URL.createObjectURL(f)
                      setAreaCoverPreview((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <div className="mb-2 mt-8"><Label className="block">Descrição</Label></div>
                <RichTextEditor
                  content={editorMarkdown}
                  onChange={(html) => { draftMdRef.current = html; setEditorMarkdown(html) }}
                  placeholder="Descreva esta área de atuação..."
                  minHeight="300px"
                />
              </div>
              <DialogFooter>
                <Button onClick={async () => {
                  if (!editingArea || areaSaving) return
                  try {
                    setAreaSaving(true)
                    if (areaCoverFile) {
                      const fd = new FormData()
                      fd.set("id", editingArea.id); fd.set("title", editingArea.title)
                      fd.set("description", draftMdRef.current)
                      fd.set("cover", areaCoverFile)
                      const res = await fetch("/api/activity-areas", { method: "PATCH", body: fd })
                      if (!res.ok) { alert("Falha ao salvar área"); return }
                      const data = await res.json()
                      setAreas((prev) => prev.map((a) => (a.id === data.area.id ? data.area : a)))
                      await qc.invalidateQueries({ queryKey: ["profile"] })
                      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                      setAreaCoverFile(null); setAreaCoverPreview(null); setRemoveAreaCover(false); setEditingArea(null)
                    } else {
                      await patchAreaMutation.mutateAsync({
                        ...editingArea, description: draftMdRef.current,
                        coverImageUrl: removeAreaCover ? null : editingArea.coverImageUrl,
                      })
                      await qc.invalidateQueries({ queryKey: ["profile"] })
                      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                      setEditingArea(null); setRemoveAreaCover(false)
                    }
                  } finally { setAreaSaving(false) }
                }} className="gap-2 cursor-pointer" disabled={areaSaving || patchAreaMutation.isPending} aria-busy={areaSaving || patchAreaMutation.isPending}>
                  <Save className="w-4 h-4" /> {areaSaving || patchAreaMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="ghost" className="gap-2 cursor-pointer" onClick={() => setEditingArea(null)}>
                  <X className="w-4 h-4" /> Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete area confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir área</DialogTitle></DialogHeader>
          {deleteConfirm && (
            <div className="space-y-3">
              <p>Tem certeza que deseja excluir a área &quot;{deleteConfirm.title}&quot;? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button variant="destructive" onClick={async () => {
                  try { await deleteMutation.mutateAsync(deleteConfirm.id); showToast("Área excluída") }
                  catch { showToast("Falha ao excluir área") }
                }} className="cursor-pointer" disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
