import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { GalleryItem } from "@/app/profile/edit/types"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"

const mockUseEditForm = vi.hoisted(() => vi.fn())

// Capture the onDragStart / onDragEnd callbacks so tests can trigger them
const capturedDndHandlers = vi.hoisted(
  () => ({ onDragStart: null as ((e: DragStartEvent) => void) | null, onDragEnd: null as ((e: DragEndEvent) => void) | null })
)

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
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
    // capture for tests
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
  rectSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}))

import GaleriaSection from "@/app/profile/edit/sections/GaleriaSection"

const photo1: GalleryItem = { id: "photo-1", coverImageUrl: "https://example.com/photo1.jpg" }
const photo2: GalleryItem = { id: "photo-2", coverImageUrl: "https://example.com/photo2.jpg" }
const photoNoImage: GalleryItem = { id: "photo-3", coverImageUrl: null }

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    gallery: [] as GalleryItem[],
    setGallery: vi.fn(),
    galleryUploading: false,
    deleteGalleryConfirm: null,
    setDeleteGalleryConfirm: vi.fn(),
    uploadGalleryMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ item: photo1 }),
      isPending: false,
    },
    reorderGalleryMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    },
    deleteGalleryMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    },
    showToast: vi.fn(),
    ...overrides,
  }
}

describe("GaleriaSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDndHandlers.onDragStart = null
    capturedDndHandlers.onDragEnd = null
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  it("renders Suas fotos heading", () => {
    render(<GaleriaSection />)
    expect(screen.getByText("Suas fotos")).toBeInTheDocument()
  })

  it("renders Nova foto upload button", () => {
    render(<GaleriaSection />)
    expect(screen.getByText("Nova foto")).toBeInTheDocument()
  })

  it("shows empty state when gallery has no photos", () => {
    render(<GaleriaSection />)
    expect(screen.getByText("Nenhuma foto na galeria")).toBeInTheDocument()
  })

  it("does not show empty state when gallery has photos", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ gallery: [photo1] }))
    render(<GaleriaSection />)
    expect(screen.queryByText("Nenhuma foto na galeria")).not.toBeInTheDocument()
  })

  it("renders photo thumbnails when gallery has items", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ gallery: [photo1, photo2] }))
    render(<GaleriaSection />)
    const deleteButtons = screen.getAllByRole("button", { name: "Excluir foto" })
    expect(deleteButtons).toHaveLength(2)
  })

  it("renders img element for gallery photos with a URL", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ gallery: [photo1] }))
    const { container } = render(<GaleriaSection />)
    // Gallery img has alt="" so getByRole("img") won't find it — query directly
    const img = container.querySelector('img[src="https://example.com/photo1.jpg"]')
    expect(img).not.toBeNull()
  })

  it("shows 'Sem imagem' placeholder for photos without a URL", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ gallery: [photoNoImage] }))
    render(<GaleriaSection />)
    expect(screen.getByText("Sem imagem")).toBeInTheDocument()
  })

  it("shows uploading state text when galleryUploading is true", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ galleryUploading: true }))
    render(<GaleriaSection />)
    expect(screen.getByText("Enviando...")).toBeInTheDocument()
  })

  it("calls setDeleteGalleryConfirm when delete button is clicked", async () => {
    const setDeleteGalleryConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ gallery: [photo1], setDeleteGalleryConfirm })
    )
    render(<GaleriaSection />)
    await userEvent.click(screen.getByRole("button", { name: "Excluir foto" }))
    expect(setDeleteGalleryConfirm).toHaveBeenCalledWith(photo1)
  })

  it("renders the delete confirmation dialog when deleteGalleryConfirm is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteGalleryConfirm: photo1 })
    )
    render(<GaleriaSection />)
    expect(screen.getByText("Excluir foto")).toBeInTheDocument()
    expect(screen.getByText(/excluir esta foto da galeria/i)).toBeInTheDocument()
  })

  it("calls deleteGalleryMutation when confirm delete button is clicked", async () => {
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteGalleryConfirm: photo1,
        deleteGalleryMutation: { mutateAsync: deleteAsync, isPending: false },
      })
    )
    render(<GaleriaSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith("photo-1"))
  })

  it("shows Cancelar button in delete dialog", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ deleteGalleryConfirm: photo1 }))
    render(<GaleriaSection />)
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument()
  })

  it("calls setDeleteGalleryConfirm(null) when Cancelar is clicked", async () => {
    const setDeleteGalleryConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteGalleryConfirm: photo1, setDeleteGalleryConfirm })
    )
    render(<GaleriaSection />)
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(setDeleteGalleryConfirm).toHaveBeenCalledWith(null)
  })

  it("shows toast on successful delete", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteGalleryConfirm: photo1,
        deleteGalleryMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<GaleriaSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Foto excluída"))
  })

  it("shows Excluindo... when deleteGalleryMutation is pending", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteGalleryConfirm: photo1,
        deleteGalleryMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<GaleriaSection />)
    expect(screen.getByRole("button", { name: /excluindo/i })).toBeInTheDocument()
  })

  it("shows toast 'Falha ao excluir foto' when deleteGalleryMutation throws", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockRejectedValue(new Error("server error"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteGalleryConfirm: photo1,
        deleteGalleryMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<GaleriaSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao excluir foto"))
  })

  it("calls uploadGalleryMutation.mutateAsync and shows toast when a file is uploaded", async () => {
    const showToast = vi.fn()
    const uploadAsync = vi.fn().mockResolvedValue({ item: photo1 })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        uploadGalleryMutation: { mutateAsync: uploadAsync, isPending: false },
        showToast,
        galleryUploading: false,
      })
    )
    render(<GaleriaSection />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    await userEvent.upload(fileInput, file)
    await waitFor(() => {
      expect(uploadAsync).toHaveBeenCalledWith(file)
      expect(showToast).toHaveBeenCalledWith("Foto adicionada à galeria")
    })
  })

  it("shows toast 'Falha ao enviar foto' when uploadGalleryMutation throws", async () => {
    const showToast = vi.fn()
    const uploadAsync = vi.fn().mockRejectedValue(new Error("upload failed"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        uploadGalleryMutation: { mutateAsync: uploadAsync, isPending: false },
        showToast,
        galleryUploading: false,
      })
    )
    render(<GaleriaSection />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    await userEvent.upload(fileInput, file)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao enviar foto"))
  })

  it("file input is disabled when galleryUploading is true", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ galleryUploading: true }))
    render(<GaleriaSection />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeDisabled()
  })

  it("calls reorderGalleryMutation when drag ends with different positions", async () => {
    const setGallery = vi.fn()
    const reorderAsync = vi.fn().mockResolvedValue({ ok: true })
    const gallery = [photo1, photo2]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        gallery,
        setGallery,
        reorderGalleryMutation: { mutateAsync: reorderAsync },
      })
    )
    render(<GaleriaSection />)

    // The DndContext mock captures onDragEnd — trigger it with a reorder event
    expect(capturedDndHandlers.onDragEnd).not.toBeNull()
    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "photo-1" },
        over: { id: "photo-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      expect(setGallery).toHaveBeenCalled()
      expect(reorderAsync).toHaveBeenCalled()
    })
  })

  it("does nothing when drag ends with same item", async () => {
    const setGallery = vi.fn()
    const reorderAsync = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        gallery: [photo1, photo2],
        setGallery,
        reorderGalleryMutation: { mutateAsync: reorderAsync },
      })
    )
    render(<GaleriaSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "photo-1" },
        over: { id: "photo-1" },
      } as unknown as DragEndEvent)
    })
    expect(setGallery).not.toHaveBeenCalled()
    expect(reorderAsync).not.toHaveBeenCalled()
  })

  it("does nothing when drag ends with no over", async () => {
    const setGallery = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        gallery: [photo1, photo2],
        setGallery,
      })
    )
    render(<GaleriaSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "photo-1" },
        over: null,
      } as unknown as DragEndEvent)
    })
    expect(setGallery).not.toHaveBeenCalled()
  })

  it("shows toast 'Falha ao reordenar galeria' when reorderGalleryMutation throws", async () => {
    const showToast = vi.fn()
    const reorderAsync = vi.fn().mockRejectedValue(new Error("network"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        gallery: [photo1, photo2],
        reorderGalleryMutation: { mutateAsync: reorderAsync },
        showToast,
      })
    )
    render(<GaleriaSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "photo-1" },
        over: { id: "photo-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao reordenar galeria"))
  })

  it("sets activeItem via handleDragStart", async () => {
    const gallery = [photo1, photo2]
    mockUseEditForm.mockReturnValue(buildContextValue({ gallery }))
    render(<GaleriaSection />)

    expect(capturedDndHandlers.onDragStart).not.toBeNull()
    await act(async () => {
      capturedDndHandlers.onDragStart!({
        active: { id: "photo-1" },
      } as unknown as DragStartEvent)
    })
    // After drag start, the DragOverlay should render the DragOverlayThumb
    // (the DragOverlay mock renders {children} so active item image should appear)
    const overlayContainer = screen.getByTestId("drag-overlay")
    const img = overlayContainer.querySelector('img[src="https://example.com/photo1.jpg"]')
    expect(img).not.toBeNull()
  })

  it("clears activeItem on handleDragEnd", async () => {
    const gallery = [photo1, photo2]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        gallery,
        reorderGalleryMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
      })
    )
    render(<GaleriaSection />)

    // First set an active item
    await act(async () => {
      capturedDndHandlers.onDragStart!({ active: { id: "photo-1" } } as unknown as DragStartEvent)
    })
    // Then end the drag — activeItem should be cleared
    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "photo-1" },
        over: { id: "photo-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      // After drag end, the overlay should be empty (activeItem cleared)
      const overlayContainer = screen.getByTestId("drag-overlay")
      expect(overlayContainer.querySelector("img")).toBeNull()
    })
  })
})
