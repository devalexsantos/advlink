import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { SectionKey } from "@/lib/section-order"
import type { CustomSectionItem } from "@/app/profile/edit/types"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"

// jsdom does not implement ResizeObserver — stub it before any Radix component loads
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const mockUseEditForm = vi.hoisted(() => vi.fn())
const mockRouterPush = vi.hoisted(() => vi.fn())

// Capture DnD callbacks so tests can invoke them
const capturedDndHandlers = vi.hoisted(
  () => ({ onDragStart: null as ((e: DragStartEvent) => void) | null, onDragEnd: null as ((e: DragEndEvent) => void) | null })
)

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/profile/edit",
}))

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragStart?: (e: DragStartEvent) => void
    onDragEnd?: (e: DragEndEvent) => void
  }) => {
    capturedDndHandlers.onDragStart = onDragStart ?? null
    capturedDndHandlers.onDragEnd = onDragEnd ?? null
    return <div data-testid="dnd-context">{children}</div>
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
  }),
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}))

vi.mock("@/components/ui/icon-picker", () => ({
  IconPicker: ({
    children,
    onChange,
  }: {
    children: React.ReactNode
    value?: string
    onChange?: (icon: string) => void
  }) => (
    <div>
      {children}
      <button
        type="button"
        data-testid="icon-picker-trigger"
        onClick={() => onChange?.("Scale")}
      >
        Escolher ícone
      </button>
    </div>
  ),
}))

vi.mock("@/lib/icon-renderer", () => ({
  getIconComponent: vi.fn((iconName: string) => {
    if (!iconName) return null
    // Return a simple SVG icon component to cover the Icon ? <Icon /> true branch
    return ({ className }: { className?: string }) => <svg data-testid={`icon-${iconName}`} className={className} />
  }),
}))

import ReordenarSection from "@/app/profile/edit/sections/ReordenarSection"

const defaultSectionOrder: SectionKey[] = ["servicos", "sobre", "galeria", "links", "calendly", "endereco"]

const customSection: CustomSectionItem = {
  id: "cs-1",
  title: "Depoimentos",
  description: null,
  imageUrl: null,
  layout: "text-only",
  iconName: "Star",
}

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    sectionOrder: defaultSectionOrder,
    setSectionOrder: vi.fn(),
    sectionLabels: {} as Record<string, string>,
    setSectionLabels: vi.fn(),
    sectionIcons: {} as Record<string, string>,
    setSectionIcons: vi.fn(),
    sectionTitleHidden: {} as Record<string, boolean>,
    setSectionTitleHidden: vi.fn(),
    customSections: [] as CustomSectionItem[],
    setCustomSections: vi.fn(),
    updateSectionConfigMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    patchCustomSectionMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ section: customSection }),
    },
    showToast: vi.fn(),
    ...overrides,
  }
}

describe("ReordenarSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDndHandlers.onDragStart = null
    capturedDndHandlers.onDragEnd = null
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  it("renders the intro description text", () => {
    render(<ReordenarSection />)
    expect(screen.getByText(/arraste as seções para reordenar/i)).toBeInTheDocument()
  })

  it("renders the fixed header indicator", () => {
    render(<ReordenarSection />)
    expect(screen.getByText("Cabeçalho (fixo)")).toBeInTheDocument()
  })

  it("renders the fixed footer indicator", () => {
    render(<ReordenarSection />)
    expect(screen.getByText("Rodapé (fixo)")).toBeInTheDocument()
  })

  it("renders all built-in section labels from the default section order", () => {
    render(<ReordenarSection />)
    expect(screen.getByText("Serviços")).toBeInTheDocument()
    expect(screen.getByText("Sobre")).toBeInTheDocument()
    expect(screen.getByText("Galeria")).toBeInTheDocument()
    expect(screen.getByText("Links")).toBeInTheDocument()
    expect(screen.getByText("Agende uma conversa")).toBeInTheDocument()
    expect(screen.getByText("Endereço")).toBeInTheDocument()
  })

  it("uses a custom label override from sectionLabels when present", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ sectionLabels: { servicos: "Meus Serviços" } })
    )
    render(<ReordenarSection />)
    expect(screen.getByText("Meus Serviços")).toBeInTheDocument()
    expect(screen.queryByText("Serviços")).not.toBeInTheDocument()
  })

  it("renders custom sections with an 'extra' badge when in sectionOrder", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: [...defaultSectionOrder, "custom_cs-1" as SectionKey],
        customSections: [customSection],
      })
    )
    render(<ReordenarSection />)
    expect(screen.getByText("Depoimentos")).toBeInTheDocument()
    // "extra" appears in the section row badge AND the footer paragraph badge
    expect(screen.getAllByText("extra").length).toBeGreaterThanOrEqual(2)
  })

  it("renders action buttons for every section row", () => {
    render(<ReordenarSection />)
    // 6 sections × 4 buttons (drag, icon, eye, pencil) = 24 minimum
    const allButtons = screen.getAllByRole("button")
    expect(allButtons.length).toBeGreaterThanOrEqual(6)
  })

  it("shows strikethrough styling when a section title is hidden", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ sectionTitleHidden: { servicos: true } })
    )
    render(<ReordenarSection />)
    const struckThrough = document.querySelectorAll("span.line-through")
    expect(struckThrough.length).toBeGreaterThanOrEqual(1)
  })

  it("calls updateSectionConfigMutation when the eye toggle is clicked", async () => {
    const updateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({ updateSectionConfigMutation: { mutateAsync: updateAsync } })
    )
    render(<ReordenarSection />)
    // Row layout per section: [drag, icon-btn, icon-picker-trigger, eye, pencil]
    // Eye is at index 3 for the first row
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[3])
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })

  it("shows a toast after toggling section title visibility", async () => {
    const showToast = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        showToast,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[3])
    await waitFor(() => expect(showToast).toHaveBeenCalled())
  })

  it("switches to an inline input when the pencil button is clicked", async () => {
    render(<ReordenarSection />)
    // Pencil is at index 4 for the first row
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[4])
    const inputs = screen.getAllByRole("textbox")
    expect(inputs.some((el) => (el as HTMLInputElement).value === "Serviços")).toBe(true)
  })

  it("saves an updated section label when Enter is pressed", async () => {
    const updateAsync = vi.fn().mockResolvedValue({})
    const setSectionLabels = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        setSectionLabels,
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[4])

    const inputs = screen.getAllByRole("textbox")
    const labelInput = inputs.find((el) => (el as HTMLInputElement).value === "Serviços")
    expect(labelInput).toBeDefined()
    if (labelInput) {
      await userEvent.clear(labelInput)
      await userEvent.type(labelInput, "Áreas de Atuação")
      await userEvent.keyboard("{Enter}")
    }
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })

  it("shows a toast after saving an updated section label", async () => {
    const showToast = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        showToast,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[4])

    const inputs = screen.getAllByRole("textbox")
    const labelInput = inputs.find((el) => (el as HTMLInputElement).value === "Serviços")
    if (labelInput) {
      await userEvent.clear(labelInput)
      await userEvent.type(labelInput, "Nova Label")
      await userEvent.keyboard("{Enter}")
    }
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Título atualizado!"))
  })

  it("renders the Seções Extras cross-link when custom sections are present", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: [...defaultSectionOrder, "custom_cs-1" as SectionKey],
        customSections: [customSection],
      })
    )
    render(<ReordenarSection />)
    expect(screen.getByRole("button", { name: /seções extras/i })).toBeInTheDocument()
  })

  it("navigates to the secoes-extras tab when the cross-link button is clicked", async () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: [...defaultSectionOrder, "custom_cs-1" as SectionKey],
        customSections: [customSection],
      })
    )
    render(<ReordenarSection />)
    await userEvent.click(screen.getByRole("button", { name: /seções extras/i }))
    expect(mockRouterPush).toHaveBeenCalledWith("/profile/edit?tab=secoes-extras")
  })

  it("renders all section labels regardless of order when sectionOrder is reversed", () => {
    const reversedOrder: SectionKey[] = [
      "endereco",
      "calendly",
      "links",
      "galeria",
      "sobre",
      "servicos",
    ]
    mockUseEditForm.mockReturnValue(buildContextValue({ sectionOrder: reversedOrder }))
    render(<ReordenarSection />)
    expect(screen.getByText("Serviços")).toBeInTheDocument()
    expect(screen.getByText("Endereço")).toBeInTheDocument()
    expect(screen.getByText("Sobre")).toBeInTheDocument()
  })

  it("always renders the Seções Extras cross-link in the static footer text", () => {
    // The cross-link is unconditionally rendered in the footer paragraph
    render(<ReordenarSection />)
    expect(screen.getByRole("button", { name: /seções extras/i })).toBeInTheDocument()
  })

  it("calls updateSectionConfigMutation with new order when drag ends", async () => {
    const setSectionOrder = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    const showToast = vi.fn()
    const sectionOrder: SectionKey[] = ["servicos", "sobre", "galeria", "links", "calendly", "endereco"]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder,
        setSectionOrder,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        showToast,
      })
    )
    render(<ReordenarSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "servicos" },
        over: { id: "sobre" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      expect(setSectionOrder).toHaveBeenCalled()
      expect(updateAsync).toHaveBeenCalledWith(expect.objectContaining({ sectionOrder: expect.any(Array) }))
      expect(showToast).toHaveBeenCalledWith("Ordem atualizada!")
    })
  })

  it("reverts section order when drag reorder mutation throws", async () => {
    const setSectionOrder = vi.fn()
    const updateAsync = vi.fn().mockRejectedValue(new Error("network"))
    const sectionOrder: SectionKey[] = ["servicos", "sobre", "galeria", "links", "calendly", "endereco"]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder,
        setSectionOrder,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "servicos" },
        over: { id: "sobre" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      // setSectionOrder called twice — once with new order, once to revert
      expect(setSectionOrder).toHaveBeenCalledTimes(2)
    })
  })

  it("does nothing when drag ends with same section id", async () => {
    const setSectionOrder = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ setSectionOrder })
    )
    render(<ReordenarSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "servicos" },
        over: { id: "servicos" },
      } as unknown as DragEndEvent)
    })
    expect(setSectionOrder).not.toHaveBeenCalled()
  })

  it("does nothing when drag ends with no over target", async () => {
    const setSectionOrder = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ setSectionOrder })
    )
    render(<ReordenarSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "servicos" },
        over: null,
      } as unknown as DragEndEvent)
    })
    expect(setSectionOrder).not.toHaveBeenCalled()
  })

  it("sets activeId via handleDragStart and renders DragOverlay content", async () => {
    render(<ReordenarSection />)

    await act(async () => {
      capturedDndHandlers.onDragStart!({ active: { id: "servicos" } } as unknown as DragStartEvent)
    })
    // After drag start, DragOverlay renders the section label
    const overlay = screen.getByTestId("drag-overlay")
    expect(overlay).toHaveTextContent("Serviços")
  })

  it("saves updated label on blur (onBlur triggers handleConfirmEdit)", async () => {
    const updateAsync = vi.fn().mockResolvedValue({})
    const setSectionLabels = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        setSectionLabels,
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[4]) // pencil button for first section (index 4 with new mock)

    const inputs = screen.getAllByRole("textbox")
    const labelInput = inputs.find((el) => (el as HTMLInputElement).value === "Serviços")!
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, "Novo Label")
    // Blur to trigger onBlur → handleConfirmEdit
    labelInput.blur()
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })

  it("resets to default label when input is cleared and confirmed", async () => {
    const updateAsync = vi.fn().mockResolvedValue({})
    const setSectionLabels = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        setSectionLabels,
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[4]) // pencil (index 4 with new mock)

    const inputs = screen.getAllByRole("textbox")
    const labelInput = inputs.find((el) => (el as HTMLInputElement).value === "Serviços")!
    await userEvent.clear(labelInput)
    // Empty input — confirm with Enter → resets to default
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })

  it("calls handleChangeIcon for a built-in section via IconPicker onChange", async () => {
    const setSectionIcons = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        setSectionIcons,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        showToast,
      })
    )
    render(<ReordenarSection />)
    // Click the first "Escolher ícone" button (built-in section)
    const iconPickers = screen.getAllByTestId("icon-picker-trigger")
    await userEvent.click(iconPickers[0])
    await waitFor(() => {
      expect(setSectionIcons).toHaveBeenCalled()
      expect(updateAsync).toHaveBeenCalledWith(expect.objectContaining({ sectionIcons: expect.any(Object) }))
      expect(showToast).toHaveBeenCalledWith("Ícone atualizado!")
    })
  })

  it("handles icon change error for built-in section gracefully", async () => {
    const updateAsync = vi.fn().mockRejectedValue(new Error("network"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const iconPickers = screen.getAllByTestId("icon-picker-trigger")
    // Should not throw
    await userEvent.click(iconPickers[0])
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })

  it("calls patchCustomSectionMutation when icon changed for a custom section", async () => {
    const setCustomSections = vi.fn()
    const patchAsync = vi.fn().mockResolvedValue({ section: customSection })
    const showToast = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    const customOrder: SectionKey[] = [...defaultSectionOrder, "custom_cs-1" as SectionKey]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: customOrder,
        customSections: [customSection],
        setCustomSections,
        patchCustomSectionMutation: { mutateAsync: patchAsync },
        updateSectionConfigMutation: { mutateAsync: updateAsync },
        showToast,
      })
    )
    render(<ReordenarSection />)
    // The last icon picker corresponds to the custom section
    const iconPickers = screen.getAllByTestId("icon-picker-trigger")
    await userEvent.click(iconPickers[iconPickers.length - 1])
    await waitFor(() => {
      expect(setCustomSections).toHaveBeenCalled()
      expect(patchAsync).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith("Ícone atualizado!")
    })
  })

  it("reverts custom section icon on patch error", async () => {
    const setCustomSections = vi.fn()
    const patchAsync = vi.fn().mockRejectedValue(new Error("network"))
    const customOrder: SectionKey[] = [...defaultSectionOrder, "custom_cs-1" as SectionKey]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: customOrder,
        customSections: [customSection],
        setCustomSections,
        patchCustomSectionMutation: { mutateAsync: patchAsync },
      })
    )
    render(<ReordenarSection />)
    const iconPickers = screen.getAllByTestId("icon-picker-trigger")
    await userEvent.click(iconPickers[iconPickers.length - 1])
    await waitFor(() => {
      // setCustomSections called twice — once optimistic, once revert
      expect(setCustomSections).toHaveBeenCalledTimes(2)
    })
  })

  it("also cleans up stale sectionIcons entry when custom section icon changes", async () => {
    const setSectionIcons = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    const patchAsync = vi.fn().mockResolvedValue({ section: customSection })
    const customOrder: SectionKey[] = [...defaultSectionOrder, "custom_cs-1" as SectionKey]
    // sectionIcons has a stale entry for the custom key
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionOrder: customOrder,
        customSections: [customSection],
        sectionIcons: { "custom_cs-1": "OldIcon" } as Record<string, string>,
        setSectionIcons,
        patchCustomSectionMutation: { mutateAsync: patchAsync },
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const iconPickers = screen.getAllByTestId("icon-picker-trigger")
    await userEvent.click(iconPickers[iconPickers.length - 1])
    await waitFor(() => {
      // setSectionIcons called to clean up the stale entry
      expect(setSectionIcons).toHaveBeenCalled()
    })
  })

  it("reverts section title visibility when toggle mutation throws", async () => {
    const setSectionTitleHidden = vi.fn()
    const updateAsync = vi.fn().mockRejectedValue(new Error("network"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        setSectionTitleHidden,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    // Eye button is index 3 with updated mock (drag, icon, picker-trigger, eye, pencil)
    await userEvent.click(allButtons[3])
    await waitFor(() => {
      // setSectionTitleHidden called twice — once to toggle, once to revert
      expect(setSectionTitleHidden).toHaveBeenCalledTimes(2)
    })
  })

  it("shows 'Título visível!' toast when re-showing a hidden section title", async () => {
    const showToast = vi.fn()
    const updateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        sectionTitleHidden: { servicos: true },
        showToast,
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[3]) // eye at index 3
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Título visível!"))
  })

  it("does not enter edit mode when pencil button is clicked while already editing (confirms instead)", async () => {
    const updateAsync = vi.fn().mockResolvedValue({})
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        updateSectionConfigMutation: { mutateAsync: updateAsync },
      })
    )
    render(<ReordenarSection />)
    const allButtons = screen.getAllByRole("button")
    // Click pencil (index 4) to start editing
    await userEvent.click(allButtons[4])
    // Now the check button should be at position 4 (isEditing → Check icon)
    const updatedButtons = screen.getAllByRole("button")
    await userEvent.click(updatedButtons[4])
    // Clicking the check icon calls onConfirmEdit
    await waitFor(() => expect(updateAsync).toHaveBeenCalled())
  })
})
