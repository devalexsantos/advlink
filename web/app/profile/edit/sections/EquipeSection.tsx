"use client"

import { useRef, useState, useCallback } from "react"
import { Camera, GripVertical, Info, Pencil, Plus, Save, Trash2, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false })
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
import { PublicSectionHeader } from "../SectionRenderer"
import type { TeamMemberItem } from "../types"

// ---- Sortable item ----

function SortableMemberItem({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMemberItem
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  })

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

      {/* Avatar thumbnail */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <span className="flex-1 truncate text-sm">{member.name}</span>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 cursor-pointer"
        onClick={onEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Editar</span>
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function MemberOverlay({ member }: { member: TeamMemberItem }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary bg-card px-3 py-2.5 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="flex-1 truncate text-sm">{member.name}</span>
    </div>
  )
}

// ---- Dialog form state ----

type MemberForm = {
  id?: string
  name: string
  description: string
  phone: string
  whatsapp: string
  email: string
}

const emptyForm = (): MemberForm => ({
  name: "",
  description: "",
  phone: "",
  whatsapp: "",
  email: "",
})

function fromMember(m: TeamMemberItem): MemberForm {
  return {
    id: m.id,
    name: m.name,
    description: m.description ?? "",
    phone: m.phone ?? "",
    whatsapp: m.whatsapp ?? "",
    email: m.email ?? "",
  }
}

// ---- Main section ----

export default function EquipeSection() {
  const {
    teamMembers,
    setTeamMembers,
    createTeamMemberMutation,
    patchTeamMemberMutation,
    reorderTeamMembersMutation,
    deleteTeamMemberMutation,
    deleteTeamMemberConfirm,
    setDeleteTeamMemberConfirm,
    showToast,
    getCroppedBlob,
  } = useEditForm()

  const [activeItem, setActiveItem] = useState<TeamMemberItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<MemberForm>(emptyForm())
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Avatar crop state
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [memberCrop, setMemberCrop] = useState({ x: 0, y: 0 })
  const [memberZoom, setMemberZoom] = useState(1)
  const [memberCroppedAreaPixels, setMemberCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const pendingFileRef = useRef<File | null>(null)

  const onCropComplete = useCallback((_: unknown, areaPixels: { x: number; y: number; width: number; height: number }) => {
    setMemberCroppedAreaPixels(areaPixels)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function openAdd() {
    setFormData(emptyForm())
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setDialogOpen(true)
  }

  function openEdit(member: TeamMemberItem) {
    setFormData(fromMember(member))
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRemoveAvatar(false)
    pendingFileRef.current = file
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setMemberZoom(1)
      setMemberCrop({ x: 0, y: 0 })
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  async function handleCropSave() {
    if (!cropSrc || !memberCroppedAreaPixels) return
    try {
      const blob = await getCroppedBlob(cropSrc, memberCroppedAreaPixels)
      const fileName = pendingFileRef.current?.name || "avatar.jpg"
      const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
      setAvatarFile(croppedFile)
      const url = URL.createObjectURL(croppedFile)
      setAvatarPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
        return url
      })
    } finally {
      setCropOpen(false)
      setCropSrc(null)
      pendingFileRef.current = null
    }
  }

  function handleCropCancel() {
    setCropOpen(false)
    setCropSrc(null)
    pendingFileRef.current = null
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
  }

  async function handleSave() {
    if (saving) return
    if (!formData.name.trim()) {
      showToast("O nome é obrigatório")
      return
    }

    try {
      setSaving(true)
      const fd = new FormData()
      fd.set("name", formData.name.trim())
      fd.set("description", formData.description)
      fd.set("phone", formData.phone)
      fd.set("whatsapp", formData.whatsapp)
      fd.set("email", formData.email)
      if (avatarFile) fd.set("avatar", avatarFile)

      if (formData.id) {
        // Edit
        fd.set("id", formData.id)
        if (removeAvatar) fd.set("removeAvatar", "true")
        await patchTeamMemberMutation.mutateAsync(fd)
        showToast("Membro atualizado")
      } else {
        // Create
        await createTeamMemberMutation.mutateAsync(fd)
        showToast("Membro adicionado")
      }
      closeDialog()
    } catch {
      showToast("Falha ao salvar membro")
    } finally {
      setSaving(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const item = teamMembers.find((m) => m.id === event.active.id)
    setActiveItem(item ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = teamMembers.findIndex((m) => m.id === active.id)
    const newIndex = teamMembers.findIndex((m) => m.id === over.id)
    const next = arrayMove(teamMembers, oldIndex, newIndex)
    setTeamMembers(next)
    const order = next.map((m, i) => ({ id: m.id, position: i + 1 }))
    try {
      await reorderTeamMembersMutation.mutateAsync(order)
    } catch {
      showToast("Falha ao reordenar membros")
    }
  }

  const currentAvatarUrl = formData.id
    ? teamMembers.find((m) => m.id === formData.id)?.avatarUrl ?? null
    : null

  const showAvatarPreviewSrc = avatarPreview ?? (currentAvatarUrl && !removeAvatar ? currentAvatarUrl : null)

  return (
    <>
      {/* Public section header (title editor) */}
      <PublicSectionHeader sectionKey="equipe" />

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold">Membros da equipe</Label>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={openAdd}
          >
            <Plus className="w-4 h-4" /> Adicionar membro
          </Button>
        </div>

        {teamMembers.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>
              Arraste pelo ícone <GripVertical className="inline h-3.5 w-3.5" /> para reordenar
            </span>
          </div>
        )}

        <DndContext
          id="reordenar-equipe"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={teamMembers.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <SortableMemberItem
                  key={member.id}
                  member={member}
                  onEdit={() => openEdit(member)}
                  onDelete={() => setDeleteTeamMemberConfirm(member)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem && <MemberOverlay member={activeItem} />}
          </DragOverlay>
        </DndContext>

        {teamMembers.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum membro cadastrado
          </p>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="w-full max-w-lg overflow-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Editar membro" : "Adicionar membro"}</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Fechar modal"
            className="absolute right-3 top-3 z-20 rounded-full bg-background text-foreground p-2 shadow-md border border-border hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-4 py-1">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-24 h-24 rounded-full border-2 border-border bg-muted overflow-hidden cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
                title="Clique para alterar a foto"
              >
                {showAvatarPreviewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={showAvatarPreviewSrc}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {showAvatarPreviewSrc ? "Trocar foto" : "Adicionar foto"}
                </Button>
                {showAvatarPreviewSrc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleRemoveAvatar}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                )}
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div>
              <Label className="mb-1.5 block">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do membro"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5 block">Descrição</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Cargo, especialidade ou breve bio..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="mb-1.5 block">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                type="tel"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <Label className="mb-1.5 block">WhatsApp</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="5511999999999 (com código do país)"
                type="tel"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="mb-1.5 block">E-mail</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={handleSave}
              className="gap-2 cursor-pointer"
              disabled={saving || createTeamMemberMutation.isPending || patchTeamMemberMutation.isPending}
              aria-busy={saving}
            >
              <Save className="w-4 h-4" />
              {saving || createTeamMemberMutation.isPending || patchTeamMemberMutation.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
            <Button variant="ghost" className="gap-2 cursor-pointer" onClick={closeDialog}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTeamMemberConfirm} onOpenChange={(v: boolean) => !v && setDeleteTeamMemberConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir membro</DialogTitle></DialogHeader>
          {deleteTeamMemberConfirm && (
            <div className="space-y-3">
              <p>Tem certeza que deseja excluir &quot;{deleteTeamMemberConfirm.name}&quot;? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteTeamMemberConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button variant="destructive" onClick={async () => {
                  try { await deleteTeamMemberMutation.mutateAsync(deleteTeamMemberConfirm.id); showToast("Membro excluído") }
                  catch { showToast("Falha ao excluir membro") }
                }} className="cursor-pointer" disabled={deleteTeamMemberMutation.isPending}>
                  {deleteTeamMemberMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      <Dialog open={cropOpen} onOpenChange={(v) => !v && handleCropCancel()}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar foto do membro</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-muted rounded-md overflow-hidden">
            {cropSrc && (
              // @ts-expect-error dynamic import type
              <Cropper image={cropSrc} crop={memberCrop} zoom={memberZoom} aspect={1} restrictPosition={false} showGrid={false}
                onCropChange={setMemberCrop} onZoomChange={setMemberZoom}
                onCropComplete={onCropComplete} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Zoom</Label>
              <input type="range" min={1} max={3} step={0.01} value={memberZoom} onChange={(e) => setMemberZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
          <DialogFooter className="flex flex-col md:flex-row gap-3">
            <Button type="button" className="cursor-pointer" onClick={handleCropSave}>Salvar recorte</Button>
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={handleCropCancel}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
