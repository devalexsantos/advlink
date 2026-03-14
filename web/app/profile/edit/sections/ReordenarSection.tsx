"use client"

import { useState } from "react"
import { GripVertical, Pencil, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { IconPicker } from "@/components/ui/icon-picker"
import { getIconComponent } from "@/lib/icon-renderer"
import { getSectionIcon, isBuiltInKey, isCustomKey, DEFAULT_SECTION_LABELS } from "@/lib/section-order"
import type { SectionKey } from "@/lib/section-order"
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

function SortableSectionItem({
  sectionKey,
  label,
  iconName,
  editingKey,
  editValue,
  onStartEdit,
  onChangeEdit,
  onConfirmEdit,
  onChangeIcon,
}: {
  sectionKey: SectionKey
  label: string
  iconName: string
  editingKey: SectionKey | null
  editValue: string
  onStartEdit: (key: SectionKey) => void
  onChangeEdit: (val: string) => void
  onConfirmEdit: () => void
  onChangeIcon: (key: SectionKey, icon: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = getIconComponent(iconName)
  const isEditing = editingKey === sectionKey

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 ${isDragging ? "opacity-30" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <IconPicker value={iconName} onChange={(icon) => onChangeIcon(sectionKey, icon)}>
        <button type="button" className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
          {Icon ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4 block" />}
        </button>
      </IconPicker>
      {isEditing ? (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => onChangeEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onConfirmEdit()
            }
          }}
          onBlur={onConfirmEdit}
          className="h-8 flex-1"
        />
      ) : (
        <span className="flex-1 truncate text-sm">{label}</span>
      )}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-pointer"
        onClick={() => {
          if (isEditing) {
            onConfirmEdit()
          } else {
            onStartEdit(sectionKey)
          }
        }}
      >
        {isEditing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export default function ReordenarSection() {
  const {
    sectionOrder,
    setSectionOrder,
    sectionLabels,
    setSectionLabels,
    sectionIcons,
    setSectionIcons,
    customSections,
    setCustomSections,
    updateSectionConfigMutation,
    patchCustomSectionMutation,
    showToast,
  } = useEditForm()

  const [activeId, setActiveId] = useState<SectionKey | null>(null)
  const [editingKey, setEditingKey] = useState<SectionKey | null>(null)
  const [editValue, setEditValue] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as SectionKey)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sectionOrder.indexOf(active.id as SectionKey)
    const newIndex = sectionOrder.indexOf(over.id as SectionKey)
    const newOrder = arrayMove(sectionOrder, oldIndex, newIndex)
    setSectionOrder(newOrder)

    try {
      await updateSectionConfigMutation.mutateAsync({ sectionOrder: newOrder })
      showToast("Ordem atualizada!")
    } catch {
      setSectionOrder(sectionOrder)
    }
  }

  function getLabel(key: SectionKey): string {
    if (sectionLabels[key]) return sectionLabels[key]!
    if (isBuiltInKey(key)) return DEFAULT_SECTION_LABELS[key]
    // For custom sections, use the section title
    const customId = key.replace("custom_", "")
    const cs = customSections.find((s) => s.id === customId)
    return cs?.title ?? key
  }

  function getIcon(key: SectionKey): string {
    if (isBuiltInKey(key)) return getSectionIcon(key, sectionIcons)
    // Custom sections: always use section's own iconName
    const customId = key.replace("custom_", "")
    const cs = customSections.find((s) => s.id === customId)
    return cs?.iconName ?? "FileText"
  }

  function handleStartEdit(key: SectionKey) {
    setEditingKey(key)
    setEditValue(getLabel(key))
  }

  async function handleConfirmEdit() {
    if (!editingKey) return
    const trimmed = editValue.trim()
    const key = editingKey
    setEditingKey(null)

    const defaultLabel = isBuiltInKey(key) ? DEFAULT_SECTION_LABELS[key] : getLabel(key)
    if (!trimmed || trimmed === defaultLabel) {
      const updated = { ...sectionLabels }
      delete updated[key]
      setSectionLabels(updated)
      try {
        await updateSectionConfigMutation.mutateAsync({ sectionLabels: updated as Record<string, string> })
        showToast("Título atualizado!")
      } catch {
        // revert silently
      }
      return
    }

    const updated = { ...sectionLabels, [key]: trimmed }
    setSectionLabels(updated)
    try {
      await updateSectionConfigMutation.mutateAsync({ sectionLabels: updated as Record<string, string> })
      showToast("Título atualizado!")
    } catch {
      // revert silently
    }
  }

  async function handleChangeIcon(key: SectionKey, icon: string) {
    if (isCustomKey(key)) {
      // Custom sections: update the section's own iconName field
      const customId = key.replace("custom_", "")
      const cs = customSections.find((s) => s.id === customId)
      if (!cs) return
      // Optimistic update
      setCustomSections((prev) => prev.map((s) => s.id === customId ? { ...s, iconName: icon } : s))
      try {
        const fd = new FormData()
        fd.set("iconName", icon)
        await patchCustomSectionMutation.mutateAsync({ id: customId, formData: fd })
        // Clean up any stale sectionIcons entry for this custom key
        if (sectionIcons[key]) {
          const cleaned = { ...sectionIcons }
          delete cleaned[key]
          setSectionIcons(cleaned)
          await updateSectionConfigMutation.mutateAsync({ sectionIcons: cleaned })
        }
        showToast("Ícone atualizado!")
      } catch {
        setCustomSections((prev) => prev.map((s) => s.id === customId ? { ...s, iconName: cs.iconName } : s))
      }
    } else {
      // Built-in sections: update profile-level sectionIcons
      const updated = { ...sectionIcons, [key]: icon }
      setSectionIcons(updated)
      try {
        await updateSectionConfigMutation.mutateAsync({ sectionIcons: updated })
        showToast("Ícone atualizado!")
      } catch {
        // revert silently
      }
    }
  }

  const activeItem = activeId ? { key: activeId, label: getLabel(activeId) } : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arraste as seções para reordenar. Clique no ícone para alterá-lo, e no lápis para editar o título.
      </p>

      {/* Fixed header indicator */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 opacity-60">
        <span className="text-sm font-medium">Cabeçalho (fixo)</span>
      </div>

      <DndContext
        id="reordenar-sections"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sectionOrder.map((key) => (
              <SortableSectionItem
                key={key}
                sectionKey={key}
                label={getLabel(key)}
                iconName={getIcon(key)}
                editingKey={editingKey}
                editValue={editValue}
                onStartEdit={handleStartEdit}
                onChangeEdit={setEditValue}
                onConfirmEdit={handleConfirmEdit}
                onChangeIcon={handleChangeIcon}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {(() => {
                const Icon = getIconComponent(getIcon(activeItem.key))
                return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null
              })()}
              <span className="flex-1 truncate text-sm">{activeItem.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Fixed footer indicator */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 opacity-60">
        <span className="text-sm font-medium">Rodapé (fixo)</span>
      </div>
    </div>
  )
}
