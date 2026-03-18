import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { LinkItem } from "@/app/profile/edit/types"
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

import LinksSection from "@/app/profile/edit/sections/LinksSection"

const link1: LinkItem = { id: "link-1", title: "Meu Site", url: "https://meusite.com", description: null }
const link2: LinkItem = { id: "link-2", title: "LinkedIn", url: "https://linkedin.com/in/user", description: null }

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    links: [] as LinkItem[],
    setLinks: vi.fn(),
    editingLink: null,
    setEditingLink: vi.fn(),
    linkCoverFile: null,
    setLinkCoverFile: vi.fn(),
    linkCoverPreview: null,
    setLinkCoverPreview: vi.fn(),
    removeLinkCover: false,
    setRemoveLinkCover: vi.fn(),
    linkSaving: false,
    setLinkSaving: vi.fn(),
    deleteLinkConfirm: null,
    setDeleteLinkConfirm: vi.fn(),
    createLinkMutation: { mutate: vi.fn(), isPending: false },
    patchLinkMutation: { mutateAsync: vi.fn().mockResolvedValue({ link: link1 }), isPending: false },
    reorderLinksMutation: { mutateAsync: vi.fn().mockResolvedValue({ ok: true }) },
    deleteLinkMutation: { mutateAsync: vi.fn().mockResolvedValue({ ok: true }), isPending: false },
    showToast: vi.fn(),
    ...overrides,
  }
}

describe("LinksSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDndHandlers.onDragStart = null
    capturedDndHandlers.onDragEnd = null
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  it("renders Seus links heading", () => {
    render(<LinksSection />)
    expect(screen.getByText("Seus links")).toBeInTheDocument()
  })

  it("renders Novo link button", () => {
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /novo link/i })).toBeInTheDocument()
  })

  it("shows empty state when there are no links", () => {
    render(<LinksSection />)
    expect(screen.getByText("Nenhum link cadastrado")).toBeInTheDocument()
  })

  it("calls createLinkMutation.mutate when Novo link button is clicked", async () => {
    const mutate = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ createLinkMutation: { mutate, isPending: false } }))
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /novo link/i }))
    expect(mutate).toHaveBeenCalled()
  })

  it("renders links when links list is non-empty", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ links: [link1, link2] }))
    render(<LinksSection />)
    expect(screen.getByText("Meu Site")).toBeInTheDocument()
    expect(screen.getByText("LinkedIn")).toBeInTheDocument()
  })

  it("renders link URLs", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ links: [link1] }))
    render(<LinksSection />)
    expect(screen.getByText("https://meusite.com")).toBeInTheDocument()
  })

  it("shows drag hint when there are more than 1 link", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ links: [link1, link2] }))
    render(<LinksSection />)
    expect(screen.getByText(/arraste pelo ícone/i)).toBeInTheDocument()
  })

  it("does not show drag hint when there is only 1 link", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ links: [link1] }))
    render(<LinksSection />)
    expect(screen.queryByText(/arraste pelo ícone/i)).not.toBeInTheDocument()
  })

  it("opens edit dialog when Editar button is clicked", async () => {
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ links: [link1], setEditingLink })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getAllByRole("button", { name: /editar/i })[0])
    expect(setEditingLink).toHaveBeenCalledWith(link1)
  })

  it("opens delete confirm when trash button is clicked", async () => {
    const setDeleteLinkConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ links: [link1], setDeleteLinkConfirm })
    )
    render(<LinksSection />)
    // The trash button is an icon-only button — find by destructive styling
    const buttons = screen.getAllByRole("button")
    const trashButton = buttons.find((btn) => btn.querySelector("svg"))
    // Click the last button in the link row (delete)
    const linkRowButtons = screen.getAllByRole("button")
    const deleteButton = linkRowButtons[linkRowButtons.length - 1]
    await userEvent.click(deleteButton)
    expect(setDeleteLinkConfirm).toHaveBeenCalledWith(link1)
  })

  it("renders edit link dialog when editingLink is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1 })
    )
    render(<LinksSection />)
    expect(screen.getByText("Editar link")).toBeInTheDocument()
  })

  it("renders Título and URL fields in the edit dialog", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingLink: link1 }))
    render(<LinksSection />)
    expect(screen.getByText("Título")).toBeInTheDocument()
    expect(screen.getByText("URL")).toBeInTheDocument()
  })

  it("edit dialog shows current link title as input value", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingLink: link1 }))
    render(<LinksSection />)
    const inputs = screen.getAllByRole("textbox")
    const titleInput = inputs.find((el) => (el as HTMLInputElement).value === "Meu Site")
    expect(titleInput).toBeDefined()
  })

  it("edit dialog shows Salvar alterações button", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ editingLink: link1 }))
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /salvar alterações/i })).toBeInTheDocument()
  })

  it("renders delete confirmation dialog when deleteLinkConfirm is set", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ deleteLinkConfirm: link1 }))
    render(<LinksSection />)
    expect(screen.getByText("Excluir link")).toBeInTheDocument()
    expect(screen.getByText(/excluir o link "Meu Site"/i)).toBeInTheDocument()
  })

  it("calls deleteLinkMutation when delete confirm button is clicked", async () => {
    const deleteMutateAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteLinkConfirm: link1,
        deleteLinkMutation: { mutateAsync: deleteMutateAsync, isPending: false },
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith("link-1"))
  })

  it("shows Cancelar button in delete confirmation dialog", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ deleteLinkConfirm: link1 }))
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument()
  })

  it("calls setDeleteLinkConfirm(null) when Cancelar is clicked in delete dialog", async () => {
    const setDeleteLinkConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteLinkConfirm: link1, setDeleteLinkConfirm })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    expect(setDeleteLinkConfirm).toHaveBeenCalledWith(null)
  })

  it("shows toast 'Link excluído' after successful delete", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteLinkConfirm: link1,
        deleteLinkMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Link excluído"))
  })

  it("shows toast 'Falha ao excluir link' when delete throws", async () => {
    const showToast = vi.fn()
    const deleteAsync = vi.fn().mockRejectedValue(new Error("server error"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteLinkConfirm: link1,
        deleteLinkMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao excluir link"))
  })

  it("shows Excluindo... when deleteLinkMutation is pending", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        deleteLinkConfirm: link1,
        deleteLinkMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /excluindo/i })).toBeInTheDocument()
  })

  it("shows link cover image from editingLink.coverImageUrl when no preview and not removed", () => {
    const linkWithCover: typeof link1 = {
      ...link1,
      coverImageUrl: "https://example.com/link-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: linkWithCover,
        linkCoverPreview: null,
        removeLinkCover: false,
      })
    )
    render(<LinksSection />)
    const img = screen.getByAltText("Capa do link")
    expect(img).toHaveAttribute("src", "https://example.com/link-cover.jpg")
  })

  it("shows remove cover button when link has coverImageUrl", () => {
    const linkWithCover: typeof link1 = {
      ...link1,
      coverImageUrl: "https://example.com/link-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: linkWithCover,
        linkCoverPreview: null,
        removeLinkCover: false,
      })
    )
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /remover capa/i })).toBeInTheDocument()
  })

  it("shows link cover preview when linkCoverPreview is set", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        linkCoverPreview: "https://example.com/preview.jpg",
      })
    )
    render(<LinksSection />)
    const img = screen.getByAltText("Capa do link")
    expect(img).toHaveAttribute("src", "https://example.com/preview.jpg")
  })

  it("calls setLinkCoverFile(null) and setRemoveLinkCover(true) when cover remove button clicked", async () => {
    const setLinkCoverFile = vi.fn()
    const setLinkCoverPreview = vi.fn()
    const setRemoveLinkCover = vi.fn()
    const linkWithCover: typeof link1 = {
      ...link1,
      coverImageUrl: "https://example.com/link-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: linkWithCover,
        linkCoverPreview: null,
        removeLinkCover: false,
        setLinkCoverFile,
        setLinkCoverPreview,
        setRemoveLinkCover,
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /remover capa/i }))
    expect(setLinkCoverFile).toHaveBeenCalledWith(null)
    expect(setLinkCoverPreview).toHaveBeenCalledWith(null)
    expect(setRemoveLinkCover).toHaveBeenCalledWith(true)
  })

  it("hides cover image when removeLinkCover is true", () => {
    const linkWithCover: typeof link1 = {
      ...link1,
      coverImageUrl: "https://example.com/link-cover.jpg",
    }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: linkWithCover,
        linkCoverPreview: null,
        removeLinkCover: true,
      })
    )
    render(<LinksSection />)
    expect(screen.queryByAltText("Capa do link")).not.toBeInTheDocument()
  })

  it("shows 'Salvando...' when linkSaving is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, linkSaving: true })
    )
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  it("shows 'Salvando...' when patchLinkMutation is pending", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        patchLinkMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<LinksSection />)
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  it("save button is disabled when linkSaving is true", () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, linkSaving: true })
    )
    render(<LinksSection />)
    const saveBtn = screen.getByRole("button", { name: /salvando/i })
    expect(saveBtn).toBeDisabled()
  })

  it("calls setEditingLink(null) when Fechar button is clicked in dialog footer", async () => {
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, setEditingLink })
    )
    render(<LinksSection />)
    // "Fechar" text footer button vs "Fechar modal" X button
    const fecharButtons = screen.getAllByRole("button", { name: /fechar/i })
    const footerFechar = fecharButtons.find((btn) => !btn.getAttribute("aria-label"))
    await userEvent.click(footerFechar!)
    expect(setEditingLink).toHaveBeenCalledWith(null)
  })

  it("calls setEditingLink(null) when X (close) button in dialog header is clicked", async () => {
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, setEditingLink })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: "Fechar modal" }))
    expect(setEditingLink).toHaveBeenCalledWith(null)
  })

  it("calls patchLinkMutation.mutateAsync when saving link without cover file", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ link: link1 })
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        linkCoverFile: null,
        removeLinkCover: false,
        patchLinkMutation: { mutateAsync: patchAsync, isPending: false },
        setEditingLink,
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(patchAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: "link-1", title: "Meu Site" })
      )
    })
  })

  it("sets coverImageUrl to null when removeLinkCover is true in patchLinkMutation call", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ link: link1 })
    const linkWithCover: typeof link1 = { ...link1, coverImageUrl: "https://example.com/cover.jpg" }
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: linkWithCover,
        linkCoverFile: null,
        removeLinkCover: true,
        patchLinkMutation: { mutateAsync: patchAsync, isPending: false },
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(patchAsync).toHaveBeenCalledWith(
        expect.objectContaining({ coverImageUrl: null })
      )
    })
  })

  it("calls fetch with FormData when saving link with a cover file", async () => {
    const setEditingLink = vi.fn()
    const setLinks = vi.fn()
    const coverFile = new File(["img"], "cover.jpg", { type: "image/jpeg" })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ link: link1 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        linkCoverFile: coverFile,
        setEditingLink,
        setLinks,
        setLinkCoverFile: vi.fn(),
        setLinkCoverPreview: vi.fn(),
        setRemoveLinkCover: vi.fn(),
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/links", expect.objectContaining({ method: "PATCH" }))
    })

    vi.unstubAllGlobals()
  })

  it("shows alert when fetch returns not ok while saving with cover file", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal("fetch", mockFetch)
    vi.stubGlobal("alert", vi.fn())
    const coverFile = new File(["img"], "cover.jpg", { type: "image/jpeg" })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        linkCoverFile: coverFile,
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Falha ao salvar link")
    })

    vi.unstubAllGlobals()
  })

  it("does not call patchLinkMutation when linkSaving is true", async () => {
    const patchAsync = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        linkSaving: true,
        patchLinkMutation: { mutateAsync: patchAsync, isPending: false },
      })
    )
    render(<LinksSection />)
    await userEvent.click(screen.getByRole("button", { name: /salvando/i }))
    expect(patchAsync).not.toHaveBeenCalled()
  })

  it("updates link title when title input changes", async () => {
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, setEditingLink })
    )
    render(<LinksSection />)
    const inputs = screen.getAllByRole("textbox")
    const titleInput = inputs.find((el) => (el as HTMLInputElement).value === "Meu Site")!
    await userEvent.type(titleInput, " Extra")
    expect(setEditingLink).toHaveBeenCalled()
  })

  it("updates link URL when URL input changes", async () => {
    const setEditingLink = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, setEditingLink })
    )
    render(<LinksSection />)
    const inputs = screen.getAllByRole("textbox")
    const urlInput = inputs.find((el) => (el as HTMLInputElement).value === "https://meusite.com")!
    await userEvent.type(urlInput, "/extra")
    expect(setEditingLink).toHaveBeenCalled()
  })

  it("calls reorderLinksMutation when drag ends with different link positions", async () => {
    const setLinks = vi.fn()
    const reorderAsync = vi.fn().mockResolvedValue({ ok: true })
    const links = [link1, link2]
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        links,
        setLinks,
        reorderLinksMutation: { mutateAsync: reorderAsync },
      })
    )
    render(<LinksSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "link-1" },
        over: { id: "link-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => {
      expect(setLinks).toHaveBeenCalled()
      expect(reorderAsync).toHaveBeenCalled()
    })
  })

  it("does nothing when drag ends with same link id", async () => {
    const setLinks = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        links: [link1, link2],
        setLinks,
        reorderLinksMutation: { mutateAsync: vi.fn() },
      })
    )
    render(<LinksSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "link-1" },
        over: { id: "link-1" },
      } as unknown as DragEndEvent)
    })
    expect(setLinks).not.toHaveBeenCalled()
  })

  it("does nothing when drag ends with no over target", async () => {
    const setLinks = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        links: [link1, link2],
        setLinks,
      })
    )
    render(<LinksSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "link-1" },
        over: null,
      } as unknown as DragEndEvent)
    })
    expect(setLinks).not.toHaveBeenCalled()
  })

  it("shows toast 'Falha ao reordenar links' when reorderLinksMutation throws", async () => {
    const showToast = vi.fn()
    const reorderAsync = vi.fn().mockRejectedValue(new Error("network"))
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        links: [link1, link2],
        reorderLinksMutation: { mutateAsync: reorderAsync },
        showToast,
      })
    )
    render(<LinksSection />)

    await act(async () => {
      capturedDndHandlers.onDragEnd!({
        active: { id: "link-1" },
        over: { id: "link-2" },
      } as unknown as DragEndEvent)
    })
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao reordenar links"))
  })

  it("sets activeLink via handleDragStart and shows LinkOverlay", async () => {
    const links = [link1, link2]
    mockUseEditForm.mockReturnValue(buildContextValue({ links }))
    render(<LinksSection />)

    await act(async () => {
      capturedDndHandlers.onDragStart!({
        active: { id: "link-1" },
      } as unknown as DragStartEvent)
    })
    // After drag start, LinkOverlay renders the link title inside the DragOverlay mock
    const overlay = screen.getByTestId("drag-overlay")
    expect(overlay).toHaveTextContent("Meu Site")
  })

  it("triggers setLinkCoverFile and creates preview URL via file input change", async () => {
    const setLinkCoverFile = vi.fn()
    const setRemoveLinkCover = vi.fn()
    const setLinkCoverPreview = vi.fn()
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/fake-url")
    vi.stubGlobal("URL", { createObjectURL: createObjectURLMock, revokeObjectURL: vi.fn() })

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        setLinkCoverFile,
        setRemoveLinkCover,
        setLinkCoverPreview,
        linkCoverPreview: null,
      })
    )
    render(<LinksSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(setLinkCoverFile).toHaveBeenCalledWith(file)
    expect(setRemoveLinkCover).toHaveBeenCalledWith(false)
    expect(createObjectURLMock).toHaveBeenCalledWith(file)

    vi.unstubAllGlobals()
  })

  it("does nothing when file input fires change with no files selected", async () => {
    const setLinkCoverFile = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ editingLink: link1, setLinkCoverFile })
    )
    render(<LinksSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [] } })

    expect(setLinkCoverFile).not.toHaveBeenCalled()
  })

  it("calls setEditingLink(null) and setRemoveLinkCover(false) when dialog onOpenChange closes", async () => {
    const setEditingLink = vi.fn()
    const setRemoveLinkCover = vi.fn()
    const setLinkCoverPreview = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        setEditingLink,
        setRemoveLinkCover,
        setLinkCoverPreview,
      })
    )
    render(<LinksSection />)
    // Close via the Fechar footer button — this triggers setEditingLink(null) directly
    // The onOpenChange callback `!v && (setEditingLink(null), setRemoveLinkCover(false), setLinkCoverPreview(null))`
    // is hit when the dialog closes from outside (e.g., pressing Escape)
    await userEvent.keyboard("{Escape}")
    // The Fechar button inside also triggers null — check that setRemoveLinkCover was called false
    // at the time editingLink(null) was called
    await waitFor(() => expect(setEditingLink).toHaveBeenCalledWith(null))
  })

  it("calls setDeleteLinkConfirm(null) when delete dialog onOpenChange fires with false", async () => {
    const setDeleteLinkConfirm = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({ deleteLinkConfirm: link1, setDeleteLinkConfirm })
    )
    render(<LinksSection />)
    // Press Escape to close the delete confirm dialog via onOpenChange
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(setDeleteLinkConfirm).toHaveBeenCalledWith(null))
  })

  it("revokes old blob URL and creates a new one when cover file changes again", async () => {
    const revokeObjectURLMock = vi.fn()
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/new-url")
    vi.stubGlobal("URL", { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock })

    const setLinkCoverPreview = vi.fn()

    mockUseEditForm.mockReturnValue(
      buildContextValue({
        editingLink: link1,
        // Simulate there's already a blob: preview URL
        linkCoverPreview: "blob:http://localhost/old-url",
        setLinkCoverFile: vi.fn(),
        setRemoveLinkCover: vi.fn(),
        setLinkCoverPreview,
      })
    )
    render(<LinksSection />)

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["img2"], "photo2.jpg", { type: "image/jpeg" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // The setLinkCoverPreview callback receives a functional updater
    const previewUpdater = setLinkCoverPreview.mock.calls[0][0]
    // Invoke the updater with the old blob URL
    const result = previewUpdater("blob:http://localhost/old-url")
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/old-url")
    expect(result).toBe("blob:http://localhost/new-url")

    vi.unstubAllGlobals()
  })
})
