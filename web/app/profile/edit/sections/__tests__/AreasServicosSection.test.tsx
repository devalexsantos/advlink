import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Area } from "@/app/profile/edit/types"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"

const mockUseEditForm = vi.hoisted(() => vi.fn())

// Capture DnD callbacks so tests can invoke them
const capturedDndHandlers = vi.hoisted(
  () => ({ onDragStart: null as ((e: DragStartEvent) => void) | null, onDragEnd: null as ((e: DragEndEvent) => void) | null })
)

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    refetchQueries: vi.fn().mockResolvedValue(undefined),
  }),
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

vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: ({
    content,
    onChange,
    placeholder,
  }: {
    content: string
    onChange: (v: string) => void
    placeholder?: string
  }) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

import AreasServicosSection from "@/app/profile/edit/sections/AreasServicosSection"

const area1: Area = { id: "area-1", title: "Direito Civil", description: null }
const area2: Area = { id: "area-2", title: "Direito Trabalhista", description: "Especialista em CLT" }

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    areas: [] as Area[],
    setAreas: vi.fn(),
    editingArea: null,
    setEditingArea: vi.fn(),
    areaCoverFile: null,
    setAreaCoverFile: vi.fn(),
    areaCoverPreview: null,
    setAreaCoverPreview: vi.fn(),
    areaCoverGenerating: false,
    removeAreaCover: false,
    setRemoveAreaCover: vi.fn(),
    areaSaving: false,
    setAreaSaving: vi.fn(),
    editorMarkdown: "",
    setEditorMarkdown: vi.fn(),
    draftMdRef: { current: "" },
    deleteConfirm: null,
    setDeleteConfirm: vi.fn(),
    createAreaMutation: { mutate: vi.fn(), isPending: false },
    patchAreaMutation: { mutateAsync: vi.fn().mockResolvedValue({ area: area1 }), isPending: false },
    reorderMutation: { mutateAsync: vi.fn().mockResolvedValue({ ok: true }) },
    deleteMutation: { mutateAsync: vi.fn().mockResolvedValue({ ok: true }), isPending: false },
    showToast: vi.fn(),
    ...overrides,
  }
}

describe("AreasServicosSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDndHandlers.onDragStart = null
    capturedDndHandlers.onDragEnd = null
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  it("renders Suas áreas heading", () => {
    render(<AreasServicosSection />)
    expect(screen.getByText("Suas áreas")).toBeInTheDocument()
  })

  it("renders Nova área button", () => {
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /nova área/i })).toBeInTheDocument()
  })

  it("shows empty state when no areas exist", () => {
    render(<AreasServicosSection />)
    expect(screen.getByText("Nenhuma área cadastrada")).toBeInTheDocument()
  })

  it("calls createAreaMutation.mutate when Nova área is clicked", async () => {
    const mutate = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ createAreaMutation: { mutate, isPending: false } }))
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /nova área/i }))
    expect(mutate).toHaveBeenCalled()
  })

  it("renders area titles when areas list is non-empty", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ areas: [area1, area2] }))
    render(<AreasServicosSection />)
    expect(screen.getByText("Direito Civil")).toBeInTheDocument()
    expect(screen.getByText("Direito Trabalhista")).toBeInTheDocument()
  })

  it("shows drag hint when there are more than 1 area", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ areas: [area1, area2] }))
    render(<AreasServicosSection />)
    expect(screen.getByText(/arraste pelo ícone/i)).toBeInTheDocument()
  })

  it("does not show drag hint when there is only 1 area", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ areas: [area1] }))
    render(<AreasServicosSection />)
    expect(screen.queryByText(/arraste pelo ícone/i)).not.toBeInTheDocument()
  })

  it("calls setEditingArea when Editar button is clicked", async () => {
    const setEditingArea = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ areas: [area1], setEditingArea }))
    render(<AreasServicosSection />)
    await userEvent.click(screen.getAllByRole("button", { name: /editar/i })[0])
    expect(setEditingArea).toHaveBeenCalledWith(area1)
  })

  it("calls setDeleteConfirm when trash button is clicked for an area", async () => {
    const setDeleteConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ areas: [area1], setDeleteConfirm }))
    render(<AreasServicosSection />)
    // The delete button is the last button in the list row
    const allButtons = screen.getAllByRole("button")
    await userEvent.click(allButtons[allButtons.length - 1])
    expect(setDeleteConfirm).toHaveBeenCalledWith(area1)
  })

  it("renders the edit area dialog when editingArea is set", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByText("Editar área")).toBeInTheDocument()
  })

  it("edit dialog shows area title in input", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    const inputs = screen.getAllByRole("textbox")
    const titleInput = inputs.find((el) => (el as HTMLInputElement).value === "Direito Civil")
    expect(titleInput).toBeDefined()
  })

  it("edit dialog renders rich text editor for description", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument()
  })

  it("edit dialog shows Salvar alterações button", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /salvar alterações/i })).toBeInTheDocument()
  })

  it("renders Capa da área section in edit dialog", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByText("Capa da área")).toBeInTheDocument()
  })

  it("shows area cover image when areaCoverPreview is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaCoverPreview: "https://example.com/cover.jpg",
      })
    )
    render(<AreasServicosSection />)
    const img = screen.getByAltText("Capa da área")
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg")
  })

  it("shows generating state in edit dialog when areaCoverGenerating is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, areaCoverGenerating: true })
    )
    render(<AreasServicosSection />)
    expect(screen.getByText(/estamos gerando sua capa com iA/i)).toBeInTheDocument()
  })

  it("renders delete confirmation dialog when deleteConfirm is set", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ deleteConfirm: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByText("Excluir área")).toBeInTheDocument()
    expect(screen.getByText(/excluir a área "Direito Civil"/i)).toBeInTheDocument()
  })

  it("calls deleteMutation when confirm delete is clicked", async () => {
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteConfirm: area1,
        deleteMutation: { mutateAsync: deleteAsync, isPending: false },
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith("area-1"))
  })

  it("shows toast 'Área excluída' after successful delete", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteConfirm: area1,
        deleteMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Área excluída"))
  })

  it("shows Cancelar in delete dialog and calls setDeleteConfirm(null)", async () => {
    const setDeleteConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteConfirm: area1, setDeleteConfirm })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(setDeleteConfirm).toHaveBeenCalledWith(null)
  })

  it("shows Excluindo... when deleteMutation is pending", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteConfirm: area1,
        deleteMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /excluindo/i })).toBeInTheDocument()
  })

  it("shows toast 'Falha ao excluir área' when delete mutation throws", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockRejectedValue(new Error("server error"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteConfirm: area1,
        deleteMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao excluir área"))
  })

  it("shows area cover image from editingArea.coverImageUrl when no preview and not removed", () => {
    const areaWithCover: typeof area1 = {
      ...area1,
      coverImageUrl: "https://example.com/area-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: areaWithCover,
        areaCoverPreview: null,
        removeAreaCover: false,
      })
    )
    render(<AreasServicosSection />)
    const img = screen.getByAltText("Capa da área")
    expect(img).toHaveAttribute("src", "https://example.com/area-cover.jpg")
  })

  it("shows remove cover button when area has coverImageUrl", () => {
    const areaWithCover: typeof area1 = {
      ...area1,
      coverImageUrl: "https://example.com/area-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: areaWithCover,
        areaCoverPreview: null,
        removeAreaCover: false,
      })
    )
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /remover capa/i })).toBeInTheDocument()
  })

  it("calls setAreaCoverFile(null) and setRemoveAreaCover(true) when cover remove button clicked", async () => {
    const setAreaCoverFile = vi.fn()
    const setAreaCoverPreview = vi.fn()
    const setRemoveAreaCover = vi.fn()
    const areaWithCover: typeof area1 = {
      ...area1,
      coverImageUrl: "https://example.com/area-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: areaWithCover,
        areaCoverPreview: null,
        removeAreaCover: false,
        setAreaCoverFile,
        setAreaCoverPreview,
        setRemoveAreaCover,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /remover capa/i }))
    expect(setAreaCoverFile).toHaveBeenCalledWith(null)
    expect(setAreaCoverPreview).toHaveBeenCalledWith(null)
    expect(setRemoveAreaCover).toHaveBeenCalledWith(true)
  })

  it("hides cover image and remove button when removeAreaCover is true", () => {
    const areaWithCover: typeof area1 = {
      ...area1,
      coverImageUrl: "https://example.com/area-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: areaWithCover,
        areaCoverPreview: null,
        removeAreaCover: true,
      })
    )
    render(<AreasServicosSection />)
    expect(screen.queryByAltText("Capa da área")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /remover capa/i })).not.toBeInTheDocument()
  })

  it("shows 'Salvando...' when areaSaving is true in edit dialog", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, areaSaving: true })
    )
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  it("shows 'Salvando...' when patchAreaMutation is pending", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        patchAreaMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  it("save button is disabled when areaSaving is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, areaSaving: true })
    )
    render(<AreasServicosSection />)
    const saveBtn = screen.getByRole("button", { name: /salvando/i })
    expect(saveBtn).toBeDisabled()
  })

  it("calls setEditingArea(null) when Fechar button is clicked in edit dialog footer", async () => {
    const setEditingArea = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, setEditingArea })
    )
    render(<AreasServicosSection />)
    // "Fechar" text button (footer) vs "Fechar modal" (X icon button)
    const fecharButtons = screen.getAllByRole("button", { name: /fechar/i })
    const footerFechar = fecharButtons.find((btn) => btn.textContent?.includes("Fechar") && !btn.getAttribute("aria-label"))
    await userEvent.click(footerFechar!)
    expect(setEditingArea).toHaveBeenCalledWith(null)
  })

  it("calls patchAreaMutation.mutateAsync when saving without cover file", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ area: area1 })
    const setEditingArea = vi.fn()
    const setAreaSaving = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaCoverFile: null,
        removeAreaCover: false,
        draftMdRef: { current: "descrição de teste" },
        patchAreaMutation: { mutateAsync: patchAsync, isPending: false },
        setEditingArea,
        setAreaSaving,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(patchAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: "area-1", title: "Direito Civil" })
      )
    })
  })

  it("calls fetch with FormData when saving with a cover file", async () => {
    const setEditingArea = vi.fn()
    const setAreaSaving = vi.fn()
    const setAreas = vi.fn()
    const setAreaCoverFile = vi.fn()
    const setAreaCoverPreview = vi.fn()
    const setRemoveAreaCover = vi.fn()
    const coverFile = new File(["img"], "cover.jpg", { type: "image/jpeg" })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ area: area1 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaCoverFile: coverFile,
        draftMdRef: { current: "markdown" },
        setEditingArea,
        setAreaSaving,
        setAreas,
        setAreaCoverFile,
        setAreaCoverPreview,
        setRemoveAreaCover,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/activity-areas", expect.objectContaining({ method: "PATCH" }))
    })

    vi.unstubAllGlobals()
  })

  it("shows alert when fetch returns not ok while saving cover", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal("fetch", mockFetch)
    vi.stubGlobal("alert", vi.fn())
    const coverFile = new File(["img"], "cover.jpg", { type: "image/jpeg" })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaCoverFile: coverFile,
        draftMdRef: { current: "" },
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Falha ao salvar área")
    })

    vi.unstubAllGlobals()
  })

  it("does not call patchAreaMutation when areaSaving is true", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ area: area1 })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaSaving: true,
        patchAreaMutation: { mutateAsync: patchAsync, isPending: false },
      })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvando/i }))
    expect(patchAsync).not.toHaveBeenCalled()
  })

  it("updates area title when title input changes in edit dialog", async () => {
    const setEditingArea = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, setEditingArea })
    )
    render(<AreasServicosSection />)
    const inputs = screen.getAllByRole("textbox")
    const titleInput = inputs.find((el) => (el as HTMLInputElement).value === "Direito Civil")!
    await userEvent.type(titleInput, " X")
    expect(setEditingArea).toHaveBeenCalled()
  })

  it("updates editorMarkdown when rich text editor changes", async () => {
    const setEditorMarkdown = vi.fn()
    const draftMdRef = { current: "" }
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, setEditorMarkdown, draftMdRef })
    )
    render(<AreasServicosSection />)
    const editor = screen.getByTestId("rich-text-editor")
    await userEvent.type(editor, "Novo texto")
    expect(setEditorMarkdown).toHaveBeenCalled()
  })

  it("shows close (X) button in edit dialog header", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingArea: area1 }))
    render(<AreasServicosSection />)
    expect(screen.getByRole("button", { name: "Fechar modal" })).toBeInTheDocument()
  })

  it("calls setEditingArea(null) when close (X) button in dialog header is clicked", async () => {
    const setEditingArea = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, setEditingArea })
    )
    render(<AreasServicosSection />)
    await userEvent.click(screen.getByRole("button", { name: "Fechar modal" }))
    expect(setEditingArea).toHaveBeenCalledWith(null)
  })

  it("calls reorderMutation when drag ends with different area positions", async () => {
    const setAreas = vi.fn()
    const reorderAsync = vi.fn().mockResolvedValue({ ok: true })
    const areas = [area1, area2]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        areas,
        setAreas,
        reorderMutation: { mutateAsync: reorderAsync },
      })
    )
    render(<AreasServicosSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "area-1" },
        over: { id: "area-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      expect(setAreas).toHaveBeenCalled()
      expect(reorderAsync).toHaveBeenCalled()
    })
  })

  it("does nothing when drag ends with same area id", async () => {
    const setAreas = vi.fn()
    const reorderAsync = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        areas: [area1, area2],
        setAreas,
        reorderMutation: { mutateAsync: reorderAsync },
      })
    )
    render(<AreasServicosSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "area-1" },
        over: { id: "area-1" },
      } as unknown as DragEndEvent)
    })
    expect(setAreas).not.toHaveBeenCalled()
  })

  it("does nothing when drag ends with no over", async () => {
    const setAreas = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        areas: [area1, area2],
        setAreas,
      })
    )
    render(<AreasServicosSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "area-1" },
        over: null,
      } as unknown as DragEndEvent)
    })
    expect(setAreas).not.toHaveBeenCalled()
  })

  it("shows toast 'Falha ao reordenar' when reorderMutation throws", async () => {
    const showToast = vi.fn()
    const reorderAsync = vi.fn().mockRejectedValue(new Error("network"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        areas: [area1, area2],
        reorderMutation: { mutateAsync: reorderAsync },
        showToast,
      })
    )
    render(<AreasServicosSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "area-1" },
        over: { id: "area-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao reordenar"))
  })

  it("sets activeArea via handleDragStart and shows AreaOverlay", async () => {
    const areas = [area1, area2]
    mockUseEditForm.mockReturnValue(buildContextValue({ areas }))
    render(<AreasServicosSection />)

    await act(async () => {
      capturedDndHandlers.onDragStart!({
        active: { id: "area-1" },
      } as unknown as DragStartEvent)
    })
    // After drag start, AreaOverlay renders area title inside the DragOverlay mock
    const overlay = screen.getByTestId("drag-overlay")
    expect(overlay).toHaveTextContent("Direito Civil")
  })

  it("triggers setAreaCoverFile and creates preview URL via file input change", async () => {
    const setAreaCoverFile = vi.fn()
    const setRemoveAreaCover = vi.fn()
    const setAreaCoverPreview = vi.fn()
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/area-url")
    vi.stubGlobal("URL", { createObjectURL: createObjectURLMock, revokeObjectURL: vi.fn() })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        setAreaCoverFile,
        setRemoveAreaCover,
        setAreaCoverPreview,
        areaCoverPreview: null,
      })
    )
    render(<AreasServicosSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["img"], "area-cover.jpg", { type: "image/jpeg" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(setAreaCoverFile).toHaveBeenCalledWith(file)
    expect(setRemoveAreaCover).toHaveBeenCalledWith(false)
    expect(createObjectURLMock).toHaveBeenCalledWith(file)

    vi.unstubAllGlobals()
  })

  it("does nothing when area file input fires change with no files selected", async () => {
    const setAreaCoverFile = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingArea: area1, setAreaCoverFile })
    )
    render(<AreasServicosSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [] } })

    expect(setAreaCoverFile).not.toHaveBeenCalled()
  })

  it("calls setEditingArea(null) and resets cover state when edit dialog onOpenChange fires false", async () => {
    const setEditingArea = vi.fn()
    const setRemoveAreaCover = vi.fn()
    const setAreaCoverPreview = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        setEditingArea,
        setRemoveAreaCover,
        setAreaCoverPreview,
      })
    )
    render(<AreasServicosSection />)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(setEditingArea).toHaveBeenCalledWith(null))
  })

  it("calls setDeleteConfirm(null) when delete dialog onOpenChange fires false", async () => {
    const setDeleteConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteConfirm: area1, setDeleteConfirm })
    )
    render(<AreasServicosSection />)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(setDeleteConfirm).toHaveBeenCalledWith(null))
  })

  it("revokes old blob URL and creates a new one when area cover file changes again", async () => {
    const revokeObjectURLMock = vi.fn()
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/new-area-url")
    vi.stubGlobal("URL", { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock })

    const setAreaCoverPreview = vi.fn()

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingArea: area1,
        areaCoverPreview: "blob:http://localhost/old-area-url",
        setAreaCoverFile: vi.fn(),
        setRemoveAreaCover: vi.fn(),
        setAreaCoverPreview,
      })
    )
    render(<AreasServicosSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["img2"], "photo2.jpg", { type: "image/jpeg" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // The setAreaCoverPreview callback receives a functional updater
    const previewUpdater = setAreaCoverPreview.mock.calls[0][0]
    const result = previewUpdater("blob:http://localhost/old-area-url")
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/old-area-url")
    expect(result).toBe("blob:http://localhost/new-area-url")

    vi.unstubAllGlobals()
  })
})
