"use client"

import { useState } from "react"
import { GripVertical, Pencil, Plus, Save, Trash2, Upload, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
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
import type { LinkItem } from "../types"

function SortableLinkItem({ link, onEdit, onDelete }: { link: LinkItem; onEdit: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id })

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
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{link.title}</span>
        <span className="text-xs text-muted-foreground truncate block">{link.url}</span>
      </div>
      <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 cursor-pointer" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Editar</span>
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function LinkOverlay({ link }: { link: LinkItem }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary bg-card px-3 py-2.5 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{link.title}</span>
        <span className="text-xs text-muted-foreground truncate block">{link.url}</span>
      </div>
    </div>
  )
}

export default function LinksSection() {
  const {
    links, setLinks,
    editingLink, setEditingLink,
    linkCoverFile, setLinkCoverFile,
    linkCoverPreview, setLinkCoverPreview,
    removeLinkCover, setRemoveLinkCover,
    linkSaving, setLinkSaving,
    deleteLinkConfirm, setDeleteLinkConfirm,
    createLinkMutation,
    patchLinkMutation,
    reorderLinksMutation,
    deleteLinkMutation,
    showToast,
  } = useEditForm()

  const qc = useQueryClient()
  const [activeLink, setActiveLink] = useState<LinkItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const item = links.find((l) => l.id === event.active.id)
    setActiveLink(item ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLink(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = links.findIndex((l) => l.id === active.id)
    const newIndex = links.findIndex((l) => l.id === over.id)
    const next = arrayMove(links, oldIndex, newIndex)
    setLinks(next)
    const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
    try { await reorderLinksMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar links") }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">Seus links</Label>
          <Button type="button" variant="default" size="sm" className="gap-2 cursor-pointer" onClick={() => createLinkMutation.mutate()}>
            <Plus className="w-4 h-4" /> Novo link
          </Button>
        </div>

        {links.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Arraste pelo ícone <GripVertical className="inline h-3.5 w-3.5" /> para reordenar</span>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {links.map((l) => (
                <SortableLinkItem
                  key={l.id}
                  link={l}
                  onEdit={() => { setEditingLink(l); setRemoveLinkCover(false) }}
                  onDelete={() => setDeleteLinkConfirm(l)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeLink && <LinkOverlay link={activeLink} />}</DragOverlay>
        </DndContext>

        {links.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum link cadastrado</p>
        )}
      </div>

      {/* Edit link dialog */}
      <Dialog open={!!editingLink} onOpenChange={(v) => !v && (setEditingLink(null), setRemoveLinkCover(false), setLinkCoverPreview(null))}>
        <DialogContent className="overflow-visible w-full max-w-2xl">
          <DialogHeader><DialogTitle>Editar link</DialogTitle></DialogHeader>
          <button type="button" onClick={() => setEditingLink(null)} aria-label="Fechar modal"
            className="absolute right-3 top-3 z-20 rounded-full bg-background text-foreground p-2 shadow-md border border-border hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
          {editingLink && (
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Título</Label>
                <Input value={editingLink.title} onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })} />
              </div>
              <div>
                <Label className="mb-2 block">URL</Label>
                <Input value={editingLink.url} onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })} placeholder="https://" />
              </div>
              <div>
                <Label className="mb-2 block">Descrição</Label>
                <Textarea rows={4} value={editingLink.description ?? ""} onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <Label className="mb-2 block">Capa</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-32 w-32 overflow-hidden rounded-md ring-2 ring-border">
                    {(linkCoverPreview || (editingLink.coverImageUrl && !removeLinkCover)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={linkCoverPreview || (editingLink.coverImageUrl as string)} alt="Capa do link" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">Capa</div>
                    )}
                    {(linkCoverPreview || (editingLink.coverImageUrl && !removeLinkCover)) && (
                      <button type="button" className="absolute right-1 top-1 z-10 rounded-full border border-border bg-background/80 p-1 text-foreground shadow-md backdrop-blur hover:bg-muted"
                        onClick={() => { setLinkCoverFile(null); setLinkCoverPreview(null); setRemoveLinkCover(true) }} aria-label="Remover capa">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                    <Upload className="h-4 w-4" /><span>Enviar capa</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return
                      setLinkCoverFile(f); setRemoveLinkCover(false)
                      const url = URL.createObjectURL(f)
                      setLinkCoverPreview((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                    }} />
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={async () => {
                  if (!editingLink || linkSaving) return
                  try {
                    setLinkSaving(true)
                    if (linkCoverFile) {
                      const fd = new FormData()
                      fd.set("id", editingLink.id); fd.set("title", editingLink.title)
                      fd.set("description", editingLink.description ?? ""); fd.set("url", editingLink.url)
                      fd.set("cover", linkCoverFile)
                      const res = await fetch("/api/links", { method: "PATCH", body: fd })
                      if (!res.ok) { alert("Falha ao salvar link"); return }
                      const data = await res.json()
                      setLinks((prev) => prev.map((l) => (l.id === data.link.id ? data.link : l)))
                      await qc.invalidateQueries({ queryKey: ["profile"] })
                      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                      setLinkCoverFile(null); setLinkCoverPreview(null); setRemoveLinkCover(false); setEditingLink(null)
                    } else {
                      await patchLinkMutation.mutateAsync({
                        ...editingLink, coverImageUrl: removeLinkCover ? null : editingLink.coverImageUrl,
                      })
                      await qc.invalidateQueries({ queryKey: ["profile"] })
                      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                      setEditingLink(null); setRemoveLinkCover(false)
                    }
                  } finally { setLinkSaving(false) }
                }} className="gap-2 cursor-pointer" disabled={linkSaving || patchLinkMutation.isPending} aria-busy={linkSaving || patchLinkMutation.isPending}>
                  <Save className="w-4 h-4" /> {linkSaving || patchLinkMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="ghost" className="gap-2 cursor-pointer" onClick={() => setEditingLink(null)}>
                  <X className="w-4 h-4" /> Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete link confirmation */}
      <Dialog open={!!deleteLinkConfirm} onOpenChange={(v) => !v && setDeleteLinkConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir link</DialogTitle></DialogHeader>
          {deleteLinkConfirm && (
            <div className="space-y-3">
              <p>Tem certeza que deseja excluir o link &quot;{deleteLinkConfirm.title}&quot;? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteLinkConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button variant="destructive" onClick={async () => {
                  try { await deleteLinkMutation.mutateAsync(deleteLinkConfirm.id); showToast("Link excluído") }
                  catch { showToast("Falha ao excluir link") }
                }} className="cursor-pointer" disabled={deleteLinkMutation.isPending}>
                  {deleteLinkMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
