"use client"

import { useState } from "react"
import { GripVertical, Pencil, Check, Scale, HeartHandshake, Images, Link2, Calendar, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import {
  DEFAULT_SECTION_LABELS,
  type SectionKey,
} from "@/lib/section-order"

const SECTION_ICONS: Record<SectionKey, React.ElementType> = {
  servicos: Scale,
  sobre: HeartHandshake,
  galeria: Images,
  links: Link2,
  calendly: Calendar,
  endereco: MapPin,
}

function SortableSectionItem({
  sectionKey,
  label,
  editingKey,
  editValue,
  onStartEdit,
  onChangeEdit,
  onConfirmEdit,
}: {
  sectionKey: SectionKey
  label: string
  editingKey: SectionKey | null
  editValue: string
  onStartEdit: (key: SectionKey) => void
  onChangeEdit: (val: string) => void
  onConfirmEdit: () => void
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

  const Icon = SECTION_ICONS[sectionKey]
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
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
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
    updateSectionConfigMutation,
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

  function handleStartEdit(key: SectionKey) {
    setEditingKey(key)
    setEditValue(sectionLabels[key] || DEFAULT_SECTION_LABELS[key])
  }

  async function handleConfirmEdit() {
    if (!editingKey) return
    const trimmed = editValue.trim()
    const key = editingKey
    setEditingKey(null)

    if (!trimmed || trimmed === DEFAULT_SECTION_LABELS[key]) {
      // Reset to default
      const updated = { ...sectionLabels }
      delete updated[key]
      setSectionLabels(updated)
      try {
        await updateSectionConfigMutation.mutateAsync({ sectionLabels: updated })
        showToast("Título atualizado!")
      } catch {
        // revert silently
      }
      return
    }

    const updated = { ...sectionLabels, [key]: trimmed }
    setSectionLabels(updated)
    try {
      await updateSectionConfigMutation.mutateAsync({ sectionLabels: updated })
      showToast("Título atualizado!")
    } catch {
      // revert silently
    }
  }

  function getLabel(key: SectionKey) {
    return sectionLabels[key] || DEFAULT_SECTION_LABELS[key]
  }

  const activeItem = activeId ? { key: activeId, label: getLabel(activeId) } : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arraste as seções para reordenar. Clique no lápis para editar o título.
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
                editingKey={editingKey}
                editValue={editValue}
                onStartEdit={handleStartEdit}
                onChangeEdit={setEditValue}
                onConfirmEdit={handleConfirmEdit}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {(() => {
                const Icon = SECTION_ICONS[activeItem.key]
                return <Icon className="h-4 w-4 text-muted-foreground" />
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
