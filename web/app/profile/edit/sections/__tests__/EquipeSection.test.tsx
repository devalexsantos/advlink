import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { TeamMemberItem } from "@/app/profile/edit/types"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"

const mockUseEditForm = vi.hoisted(() => vi.fn())

// Capture the onDragStart / onDragEnd callbacks so tests can trigger them
const capturedDndHandlers = vi.hoisted(
  () => ({
    onDragStart: null as ((e: DragStartEvent) => void) | null,
    onDragEnd: null as ((e: DragEndEvent) => void) | null,
  })
)

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

// PublicSectionHeader depends on useEditForm too — mock the whole SectionRenderer module
vi.mock("@/app/profile/edit/SectionRenderer", () => ({
  PublicSectionHeader: ({ sectionKey }: { sectionKey: string }) => (
    <div data-testid={`public-section-header-${sectionKey}`} />
  ),
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
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  }),
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}))

// next/dynamic — return the loader result synchronously so the component renders.
// Unlike EstiloSection (where crop state lives in context), EquipeSection keeps
// crop state locally, so calling onCropComplete synchronously on every render
// would cause an infinite re-render loop. We use useEffect to fire it once.
vi.mock("next/dynamic", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect, useRef } = require("react")
  return {
    default: (loader: () => Promise<unknown>) => {
      void loader
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DynamicComponent = (props: any) => {
        const firedRef = useRef(false)
        useEffect(() => {
          if (!firedRef.current && props.onCropComplete) {
            firedRef.current = true
            props.onCropComplete(
              { x: 0, y: 0, width: 100, height: 100 },
              { x: 0, y: 0, width: 100, height: 100 }
            )
          }
        }, [props.onCropComplete])
        return <div data-testid="cropper" data-image={props.image} />
      }
      DynamicComponent.displayName = "DynamicCropper"
      return DynamicComponent
    },
  }
})

vi.mock("react-easy-crop", () => ({
  default: ({ image }: { image: string }) => (
    <div data-testid="cropper" data-image={image} />
  ),
}))

import EquipeSection from "@/app/profile/edit/sections/EquipeSection"

// ---- Fixtures ----
const member1: TeamMemberItem = {
  id: "member-1",
  name: "Ana Silva",
  description: "Advogada",
  avatarUrl: "https://example.com/ana.jpg",
  phone: "(11) 99999-0001",
  whatsapp: "5511999990001",
  email: "ana@example.com",
}

const member2: TeamMemberItem = {
  id: "member-2",
  name: "Carlos Souza",
  description: "Sócio",
  avatarUrl: null,
  phone: null,
  whatsapp: null,
  email: null,
}

// ---- Helper to stub FileReader ----
function stubFileReader() {
  const mockReadAsDataURL = vi.fn().mockImplementation(function (this: FileReader) {
    if (this.onload) {
      Object.defineProperty(this, "result", {
        value: "data:image/png;base64,mockdata",
        writable: true,
      })
      this.onload({ target: this } as ProgressEvent<FileReader>)
    }
  })
  vi.stubGlobal(
    "FileReader",
    class {
      result: string | null = null
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null
      readAsDataURL = mockReadAsDataURL
    }
  )
}

// ---- Context builder ----
function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    teamMembers: [] as TeamMemberItem[],
    setTeamMembers: vi.fn(),
    createTeamMemberMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ member: member1 }),
      isPending: false,
    },
    patchTeamMemberMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ member: member1 }),
      isPending: false,
    },
    reorderTeamMembersMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    },
    deleteTeamMemberMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    },
    deleteTeamMemberConfirm: null as TeamMemberItem | null,
    setDeleteTeamMemberConfirm: vi.fn(),
    showToast: vi.fn(),
    getCroppedBlob: vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/jpeg" })),
    ...overrides,
  }
}

describe("EquipeSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedDndHandlers.onDragStart = null
    capturedDndHandlers.onDragEnd = null
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  // ---- Basic Rendering ----

  describe("Basic Rendering", () => {
    it("renders PublicSectionHeader equipe", () => {
      render(<EquipeSection />)
      expect(screen.getByTestId("public-section-header-equipe")).toBeInTheDocument()
    })

    it("renders heading and add button", () => {
      render(<EquipeSection />)
      expect(screen.getByText("Membros da equipe")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /adicionar membro/i })).toBeInTheDocument()
    })

    it("shows empty state when no members", () => {
      render(<EquipeSection />)
      expect(screen.getByText("Nenhum membro cadastrado")).toBeInTheDocument()
    })

    it("hides empty state when members exist", () => {
      mockUseEditForm.mockReturnValue(buildContextValue({ teamMembers: [member1] }))
      render(<EquipeSection />)
      expect(screen.queryByText("Nenhum membro cadastrado")).not.toBeInTheDocument()
    })

    it("shows drag hint when more than 1 member", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1, member2] })
      )
      render(<EquipeSection />)
      expect(screen.getByText(/reordenar/i)).toBeInTheDocument()
    })
  })

  // ---- Member List ----

  describe("Member List", () => {
    it("renders member names", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1, member2] })
      )
      render(<EquipeSection />)
      expect(screen.getByText("Ana Silva")).toBeInTheDocument()
      expect(screen.getByText("Carlos Souza")).toBeInTheDocument()
    })

    it("renders avatar img for members with URL", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1] })
      )
      const { container } = render(<EquipeSection />)
      const img = container.querySelector('img[src="https://example.com/ana.jpg"]')
      expect(img).not.toBeNull()
    })

    it("renders edit and delete buttons per member", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1, member2] })
      )
      render(<EquipeSection />)
      const editButtons = screen.getAllByRole("button", { name: /editar/i })
      expect(editButtons).toHaveLength(2)
    })

    it("delete button calls setDeleteTeamMemberConfirm", () => {
      const setDeleteTeamMemberConfirm = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1],
          setDeleteTeamMemberConfirm,
        })
      )
      const { container } = render(<EquipeSection />)
      // The delete button is an icon-only button with data-size="icon"
      const iconButtons = container.querySelectorAll('button[data-size="icon"]')
      expect(iconButtons.length).toBeGreaterThanOrEqual(1)
      fireEvent.click(iconButtons[0])
      expect(setDeleteTeamMemberConfirm).toHaveBeenCalledWith(member1)
    })
  })

  // ---- Add Dialog ----

  describe("Add Dialog", () => {
    it("opens on button click", async () => {
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      expect(screen.getByRole("heading", { name: "Adicionar membro" })).toBeInTheDocument()
    })

    it("has empty fields when opened for adding", async () => {
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      expect(screen.getByPlaceholderText("Nome do membro")).toHaveValue("")
      expect(screen.getByPlaceholderText(/cargo, especialidade/i)).toHaveValue("")
      expect(screen.getByPlaceholderText("(11) 99999-9999")).toHaveValue("")
      expect(screen.getByPlaceholderText(/com código do país/i)).toHaveValue("")
      expect(screen.getByPlaceholderText("email@exemplo.com")).toHaveValue("")
    })

    it("shows all form placeholders", async () => {
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      expect(screen.getByPlaceholderText("Nome do membro")).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/cargo, especialidade/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText("(11) 99999-9999")).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/com código do país/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText("email@exemplo.com")).toBeInTheDocument()
    })

    it("closes on Cancelar", async () => {
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      expect(screen.getByRole("heading", { name: "Adicionar membro" })).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Adicionar membro" })).not.toBeInTheDocument()
      })
    })

    it("closes on X (Fechar modal)", async () => {
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      expect(screen.getByRole("heading", { name: "Adicionar membro" })).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Fechar modal" }))
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Adicionar membro" })).not.toBeInTheDocument()
      })
    })
  })

  // ---- Save / Create ----

  describe("Save / Create", () => {
    it("toast when name empty", async () => {
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(buildContextValue({ showToast }))
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      // Click Salvar without entering a name
      const saveButton = screen.getByRole("button", { name: /^salvar$/i })
      await userEvent.click(saveButton)
      expect(showToast).toHaveBeenCalledWith("O nome é obrigatório")
    })

    it("calls createTeamMemberMutation", async () => {
      const createAsync = vi.fn().mockResolvedValue({ member: member1 })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          createTeamMemberMutation: { mutateAsync: createAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      await userEvent.type(screen.getByPlaceholderText("Nome do membro"), "Novo Membro")
      await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
      await waitFor(() => {
        expect(createAsync).toHaveBeenCalled()
        const formData = createAsync.mock.calls[0][0] as FormData
        expect(formData.get("name")).toBe("Novo Membro")
      })
    })

    it("toast success after create", async () => {
      const createAsync = vi.fn().mockResolvedValue({ member: member1 })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          createTeamMemberMutation: { mutateAsync: createAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      await userEvent.type(screen.getByPlaceholderText("Nome do membro"), "Novo Membro")
      await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Membro adicionado"))
    })

    it("toast on error", async () => {
      const createAsync = vi.fn().mockRejectedValue(new Error("server error"))
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          createTeamMemberMutation: { mutateAsync: createAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))
      await userEvent.type(screen.getByPlaceholderText("Nome do membro"), "Novo Membro")
      await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao salvar membro"))
    })
  })

  // ---- Edit Dialog ----

  describe("Edit Dialog", () => {
    it("pre-fills data when editing", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1] })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      expect(screen.getByRole("heading", { name: "Editar membro" })).toBeInTheDocument()
      expect(screen.getByDisplayValue("Ana Silva")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Advogada")).toBeInTheDocument()
      expect(screen.getByDisplayValue("(11) 99999-0001")).toBeInTheDocument()
      expect(screen.getByDisplayValue("5511999990001")).toBeInTheDocument()
      expect(screen.getByDisplayValue("ana@example.com")).toBeInTheDocument()
    })

    it("calls patchTeamMemberMutation with id", async () => {
      const patchAsync = vi.fn().mockResolvedValue({ member: member1 })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1],
          patchTeamMemberMutation: { mutateAsync: patchAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
      await waitFor(() => {
        expect(patchAsync).toHaveBeenCalled()
        const formData = patchAsync.mock.calls[0][0] as FormData
        expect(formData.get("id")).toBe("member-1")
      })
    })

    it("toast success after edit", async () => {
      const patchAsync = vi.fn().mockResolvedValue({ member: member1 })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1],
          patchTeamMemberMutation: { mutateAsync: patchAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Membro atualizado"))
    })

    it("shows current avatar in edit dialog", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1] })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      const imgs = document.querySelectorAll('img[src="https://example.com/ana.jpg"]')
      expect(imgs.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ---- Avatar Upload ----

  describe("Avatar Upload", () => {
    it("shows 'Adicionar foto' when no avatar", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member2] })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      expect(screen.getByRole("button", { name: /adicionar foto/i })).toBeInTheDocument()
    })

    it("shows 'Trocar foto' and 'Remover' when avatar exists", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1] })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      expect(screen.getByRole("button", { name: /trocar foto/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /remover/i })).toBeInTheDocument()
    })

    it("Remover clears avatar preview", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1] })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /editar/i }))
      expect(screen.getByRole("button", { name: /trocar foto/i })).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: /remover/i }))
      expect(screen.getByRole("button", { name: /adicionar foto/i })).toBeInTheDocument()
    })

    it("file input opens crop dialog via FileReader", async () => {
      stubFileReader()
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["img"], "avatar.png", { type: "image/png" })
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText("Ajustar foto do membro")).toBeInTheDocument()
      })

      vi.unstubAllGlobals()
    })
  })

  // ---- Crop Dialog ----

  describe("Crop Dialog", () => {
    it("'Salvar recorte' calls getCroppedBlob", async () => {
      const fakeBlob = new Blob(["img"], { type: "image/jpeg" })
      const getCroppedBlob = vi.fn().mockResolvedValue(fakeBlob)

      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue("blob:mock-avatar-url"),
        revokeObjectURL: vi.fn(),
      })
      stubFileReader()

      mockUseEditForm.mockReturnValue(buildContextValue({ getCroppedBlob }))
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["img"], "avatar.png", { type: "image/png" })
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText("Ajustar foto do membro")).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole("button", { name: /salvar recorte/i }))
      await waitFor(() => {
        expect(getCroppedBlob).toHaveBeenCalled()
      })

      vi.unstubAllGlobals()
    })

    it("'Cancelar' closes crop dialog without saving", async () => {
      const getCroppedBlob = vi.fn()

      stubFileReader()
      mockUseEditForm.mockReturnValue(buildContextValue({ getCroppedBlob }))
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /adicionar membro/i }))

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(["img"], "avatar.png", { type: "image/png" })
      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText("Ajustar foto do membro")).toBeInTheDocument()
      })

      // There may be multiple Cancelar buttons — use the last one (crop dialog)
      const cancelButtons = screen.getAllByRole("button", { name: /cancelar/i })
      const cropCancelBtn = cancelButtons[cancelButtons.length - 1]
      await userEvent.click(cropCancelBtn)

      await waitFor(() => {
        expect(screen.queryByText("Ajustar foto do membro")).not.toBeInTheDocument()
      })
      expect(getCroppedBlob).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })
  })

  // ---- Delete Confirmation ----

  describe("Delete Confirmation", () => {
    it("renders dialog when confirm is set", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ deleteTeamMemberConfirm: member1 })
      )
      render(<EquipeSection />)
      expect(screen.getByText("Excluir membro")).toBeInTheDocument()
      expect(screen.getByText(/Ana Silva/)).toBeInTheDocument()
    })

    it("calls deleteTeamMemberMutation on confirm", async () => {
      const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          deleteTeamMemberConfirm: member1,
          deleteTeamMemberMutation: { mutateAsync: deleteAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
      await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith("member-1"))
    })

    it("toast success after delete", async () => {
      const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          deleteTeamMemberConfirm: member1,
          deleteTeamMemberMutation: { mutateAsync: deleteAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Membro excluído"))
    })

    it("toast on error when delete fails", async () => {
      const deleteAsync = vi.fn().mockRejectedValue(new Error("server error"))
      const showToast = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          deleteTeamMemberConfirm: member1,
          deleteTeamMemberMutation: { mutateAsync: deleteAsync, isPending: false },
          showToast,
        })
      )
      render(<EquipeSection />)
      await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao excluir membro"))
    })

    it("shows 'Excluindo...' when isPending", () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          deleteTeamMemberConfirm: member1,
          deleteTeamMemberMutation: { mutateAsync: vi.fn(), isPending: true },
        })
      )
      render(<EquipeSection />)
      expect(screen.getByRole("button", { name: /excluindo/i })).toBeInTheDocument()
    })
  })

  // ---- Drag-and-Drop ----

  describe("Drag-and-Drop", () => {
    it("sets activeItem via onDragStart", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({ teamMembers: [member1, member2] })
      )
      render(<EquipeSection />)

      expect(capturedDndHandlers.onDragStart).not.toBeNull()
      await act(async () => {
        capturedDndHandlers.onDragStart!({
          active: { id: "member-1" },
        } as unknown as DragStartEvent)
      })

      const overlayContainer = screen.getByTestId("drag-overlay")
      expect(overlayContainer).toHaveTextContent("Ana Silva")
    })

    it("clears activeItem on onDragEnd", async () => {
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1, member2],
          reorderTeamMembersMutation: {
            mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
          },
        })
      )
      render(<EquipeSection />)

      await act(async () => {
        capturedDndHandlers.onDragStart!({
          active: { id: "member-1" },
        } as unknown as DragStartEvent)
      })
      await act(async () => {
        capturedDndHandlers.onDragEnd!({
          active: { id: "member-1" },
          over: { id: "member-2" },
        } as unknown as DragEndEvent)
      })
      await waitFor(() => {
        const overlayContainer = screen.getByTestId("drag-overlay")
        expect(overlayContainer.textContent).toBe("")
      })
    })

    it("calls setTeamMembers and reorder mutation on drag end", async () => {
      const setTeamMembers = vi.fn()
      const reorderAsync = vi.fn().mockResolvedValue({ ok: true })
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1, member2],
          setTeamMembers,
          reorderTeamMembersMutation: { mutateAsync: reorderAsync },
        })
      )
      render(<EquipeSection />)

      await act(async () => {
        capturedDndHandlers.onDragEnd!({
          active: { id: "member-1" },
          over: { id: "member-2" },
        } as unknown as DragEndEvent)
      })
      await waitFor(() => {
        expect(setTeamMembers).toHaveBeenCalled()
        expect(reorderAsync).toHaveBeenCalled()
      })
    })

    it("no-op when dragging to same position", async () => {
      const setTeamMembers = vi.fn()
      const reorderAsync = vi.fn()
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1, member2],
          setTeamMembers,
          reorderTeamMembersMutation: { mutateAsync: reorderAsync },
        })
      )
      render(<EquipeSection />)

      await act(async () => {
        capturedDndHandlers.onDragEnd!({
          active: { id: "member-1" },
          over: { id: "member-1" },
        } as unknown as DragEndEvent)
      })
      expect(setTeamMembers).not.toHaveBeenCalled()
      expect(reorderAsync).not.toHaveBeenCalled()
    })

    it("toast on reorder failure", async () => {
      const showToast = vi.fn()
      const reorderAsync = vi.fn().mockRejectedValue(new Error("network"))
      mockUseEditForm.mockReturnValue(
        buildContextValue({
          teamMembers: [member1, member2],
          reorderTeamMembersMutation: { mutateAsync: reorderAsync },
          showToast,
        })
      )
      render(<EquipeSection />)

      await act(async () => {
        capturedDndHandlers.onDragEnd!({
          active: { id: "member-1" },
          over: { id: "member-2" },
        } as unknown as DragEndEvent)
      })
      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith("Falha ao reordenar membros")
      )
    })
  })
})
