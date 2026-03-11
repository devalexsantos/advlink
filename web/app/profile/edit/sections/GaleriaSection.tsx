"use client"

import { useState } from "react"
import { Upload, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEditForm } from "../EditFormContext"
import type { GalleryItem } from "../types"

function SortableThumb({ item, onDelete }: { item: GalleryItem; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted ${isDragging ? "opacity-30" : ""}`}
    >
      {item.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
      )}

      {/* Drag handle overlay */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 flex cursor-grab items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-6 w-6 text-white drop-shadow-md" />
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        aria-label="Excluir foto"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function DragOverlayThumb({ item }: { item: GalleryItem }) {
  return (
    <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary bg-muted shadow-xl">
      {item.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
      )}
    </div>
  )
}

export default function GaleriaSection() {
  const {
    gallery, setGallery,
    galleryUploading,
    deleteGalleryConfirm, setDeleteGalleryConfirm,
    uploadGalleryMutation,
    reorderGalleryMutation,
    deleteGalleryMutation,
    showToast,
  } = useEditForm()

  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const item = gallery.find((g) => g.id === event.active.id)
    setActiveItem(item ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = gallery.findIndex((g) => g.id === active.id)
    const newIndex = gallery.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = [...gallery]
    const [moved] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, moved)
    setGallery(next)

    const order = next.map((it, i) => ({ id: it.id as string, position: i + 1 }))
    try {
      await reorderGalleryMutation.mutateAsync(order)
    } catch {
      showToast("Falha ao reordenar galeria")
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">Suas fotos</span>
          <label className={`inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm cursor-pointer ${galleryUploading ? "opacity-50 pointer-events-none" : "hover:bg-primary/90"}`}>
            <Upload className="w-4 h-4" />
            <span>{galleryUploading ? "Enviando..." : "Nova foto"}</span>
            <input type="file" accept="image/*" className="hidden" disabled={galleryUploading}
              onChange={async (e) => {
                const inputEl = e.currentTarget as HTMLInputElement
                const f = e.target.files?.[0]; if (!f) return
                try { await uploadGalleryMutation.mutateAsync(f); showToast("Foto adicionada à galeria") }
                catch { showToast("Falha ao enviar foto") }
                finally { if (inputEl) inputEl.value = "" }
              }} />
          </label>
        </div>

        {gallery.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={gallery.map((g) => g.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((g) => (
                  <SortableThumb key={g.id} item={g} onDelete={() => setDeleteGalleryConfirm(g)} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeItem ? <DragOverlayThumb item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {gallery.length === 0 && (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-sm text-muted-foreground">
            Nenhuma foto na galeria
          </div>
        )}
      </div>

      {/* Delete gallery confirmation */}
      <Dialog open={!!deleteGalleryConfirm} onOpenChange={(v) => !v && setDeleteGalleryConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir foto</DialogTitle></DialogHeader>
          {deleteGalleryConfirm && (
            <div className="space-y-3">
              <p>Tem certeza que deseja excluir esta foto da galeria? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteGalleryConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button variant="destructive" onClick={async () => {
                  try { await deleteGalleryMutation.mutateAsync(deleteGalleryConfirm.id as string); showToast("Foto excluída") }
                  catch { showToast("Falha ao excluir foto") }
                }} className="cursor-pointer" disabled={deleteGalleryMutation.isPending}>
                  {deleteGalleryMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
