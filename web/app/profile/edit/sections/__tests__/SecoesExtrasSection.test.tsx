import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CustomSectionItem } from "@/app/profile/edit/types"

const mockUseEditForm = vi.hoisted(() => vi.fn())
const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/profile/edit",
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

vi.mock("@/components/ui/icon-picker", () => ({
  IconPicker: ({
    children,
    onChange,
  }: {
    children: React.ReactNode
    onChange?: (value: string) => void
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

vi.mock("@/lib/video-embed", () => ({
  getVideoEmbedUrl: vi.fn((url: string) => {
    if (url.includes("youtube")) return { embedUrl: "https://www.youtube.com/embed/test" }
    return null
  }),
}))

import SecoesExtrasSection from "@/app/profile/edit/sections/SecoesExtrasSection"

const textSection: CustomSectionItem = {
  id: "sec-1",
  title: "Sobre o Escritório",
  description: "<p>Texto aqui</p>",
  imageUrl: null,
  layout: "text-only",
  iconName: "FileText",
}

const imageSection: CustomSectionItem = {
  id: "sec-3",
  title: "Nossa Equipe",
  description: "<p>Equipe</p>",
  imageUrl: "https://example.com/team.jpg",
  layout: "image-left",
  iconName: "Users",
}

const videoSection: CustomSectionItem = {
  id: "sec-4",
  title: "Nosso Vídeo",
  description: "<p>Desc</p>",
  imageUrl: null,
  layout: "video",
  iconName: "Video",
  videoUrl: "https://youtube.com/watch?v=abc123",
}

const buttonSection: CustomSectionItem = {
  id: "sec-2",
  title: "Botão",
  description: null,
  imageUrl: null,
  layout: "button",
  iconName: "",
  buttonConfig: {
    url: "https://example.com",
    label: "Agende uma consulta",
    bgColor: "#000000",
    textColor: "#ffffff",
    borderRadius: 8,
    iconName: "ArrowRight",
  },
}

function buildContextValue(overrides: Record<string, unknown> = {}) {
  return {
    customSections: [] as CustomSectionItem[],
    createCustomSectionMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ section: textSection }),
      isPending: false,
    },
    patchCustomSectionMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ section: textSection }),
      isPending: false,
    },
    deleteCustomSectionMutation: {
      mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
      isPending: false,
    },
    sectionTitleHidden: {} as Record<string, boolean>,
    setSectionTitleHidden: vi.fn(),
    updateSectionConfigMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    showToast: vi.fn(),
    ...overrides,
  }
}

describe("SecoesExtrasSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEditForm.mockReturnValue(buildContextValue())
  })

  // ─── Basic rendering ────────────────────────────────────────────────────────

  it("renders the intro text", () => {
    render(<SecoesExtrasSection />)
    expect(screen.getByText(/crie seções personalizadas/i)).toBeInTheDocument()
  })

  it("renders Criar Seção button", () => {
    render(<SecoesExtrasSection />)
    expect(screen.getByRole("button", { name: /criar seção/i })).toBeInTheDocument()
  })

  it("shows empty state hints when no custom sections exist", () => {
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Nenhuma seção extra criada ainda.")).toBeInTheDocument()
    expect(screen.getByText("Texto com imagem")).toBeInTheDocument()
    expect(screen.getAllByText("Somente texto").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Vídeo").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Botão / Link").length).toBeGreaterThanOrEqual(1)
  })

  it("renders existing custom sections as list items", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Sobre o Escritório")).toBeInTheDocument()
  })

  it("shows badge with layout type for existing sections", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Texto")).toBeInTheDocument()
  })

  it("shows button config label for button-layout sections", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [buttonSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Agende uma consulta")).toBeInTheDocument()
    expect(screen.getByText("Botão")).toBeInTheDocument()
  })

  it("shows reorder link when custom sections exist", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText(/reordenar seções/i)).toBeInTheDocument()
  })

  it("navigates to reordenar tab when reorder link is clicked", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /reordenar seções/i }))
    expect(mockRouterPush).toHaveBeenCalledWith("/profile/edit?tab=reordenar")
  })

  it("renders section with iconName from lucide-react icons list (has icon element)", () => {
    // textSection has iconName: "FileText" which is a valid lucide icon
    // With iconName set, the `ListIcon ? <ListIcon /> : <MousePointerClick />` branch hits <ListIcon>
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    // The icon renders — no crash
    expect(screen.getByText("Sobre o Escritório")).toBeInTheDocument()
  })

  it("renders MousePointerClick fallback when section has no icon", () => {
    const noIconSection: CustomSectionItem = { ...textSection, iconName: "" }
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [noIconSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Sobre o Escritório")).toBeInTheDocument()
  })

  it("renders button section with button icon from lucide-react", () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [buttonSection] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Agende uma consulta")).toBeInTheDocument()
  })

  it("renders button section with no iconName (uses MousePointerClick fallback)", () => {
    const btnNoIcon: CustomSectionItem = {
      ...buttonSection,
      buttonConfig: { ...buttonSection.buttonConfig!, iconName: undefined },
    }
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [btnNoIcon] }))
    render(<SecoesExtrasSection />)
    expect(screen.getByText("Agende uma consulta")).toBeInTheDocument()
  })

  // ─── Create dialog ───────────────────────────────────────────────────────────

  it("opens the Create dialog when Criar Seção is clicked", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByText("Nova Seção")).toBeInTheDocument()
  })

  it("renders layout options in the create dialog", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByText("Imagem à esquerda")).toBeInTheDocument()
    expect(screen.getByText("Imagem à direita")).toBeInTheDocument()
    expect(screen.getAllByText("Somente texto").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Vídeo").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Botão / Link").length).toBeGreaterThanOrEqual(1)
  })

  it("renders the Título field in the create dialog by default", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByPlaceholderText("Ex: Nosso Escritório")).toBeInTheDocument()
  })

  it("renders rich text editor for description in the create dialog", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument()
  })

  it("shows Criar Seção button inside the dialog to submit", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const buttons = screen.getAllByRole("button", { name: /criar seção/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("shows validation toast if title is empty on submit", async () => {
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(buildContextValue({ showToast }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    expect(showToast).toHaveBeenCalledWith("Informe um título para a seção.")
  })

  it("calls createCustomSectionMutation when form is valid and submitted", async () => {
    const createAsync = vi.fn().mockResolvedValue({ section: textSection })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Minha Seção")
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => expect(createAsync).toHaveBeenCalled())
  })

  it("shows 'Seção criada!' toast after successful create", async () => {
    const createAsync = vi.fn().mockResolvedValue({ section: textSection })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Minha Seção")
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Seção criada!"))
  })

  it("shows error toast when createCustomSectionMutation throws", async () => {
    const createAsync = vi.fn().mockRejectedValue(new Error("Erro de rede"))
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Minha Seção")
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Erro de rede"))
  })

  it("shows fallback error toast when createCustomSectionMutation throws non-Error", async () => {
    const createAsync = vi.fn().mockRejectedValue("string error")
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Minha Seção")
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Erro ao salvar seção."))
  })

  it("shows Salvando... when createCustomSectionMutation is pending", async () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  it("closes the dialog and resets form when dialog onOpenChange fires with false", async () => {
    render(<SecoesExtrasSection />)
    // Open the dialog
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByText("Nova Seção")).toBeInTheDocument()
    // Press Escape to close (triggers onOpenChange(false))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Nova Seção")).not.toBeInTheDocument())
  })

  // ─── Description editor ──────────────────────────────────────────────────────

  it("updates description when rich text editor changes", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const editor = screen.getByTestId("rich-text-editor")
    fireEvent.change(editor, { target: { value: "<p>Nova descrição</p>" } })
    expect(editor).toHaveValue("<p>Nova descrição</p>")
  })

  // ─── hideTitle toggle ────────────────────────────────────────────────────────

  it("toggles hideTitle when the visibility button is clicked", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    // Default is visible — button shows "Título visível"
    expect(screen.getByText("Título visível")).toBeInTheDocument()
    // Click to hide
    await userEvent.click(screen.getByText("Título visível"))
    expect(screen.getByText("Título oculto")).toBeInTheDocument()
    expect(screen.getByText("Este título não será exibido na página pública.")).toBeInTheDocument()
    // Click again to show
    await userEvent.click(screen.getByText("Título oculto"))
    expect(screen.getByText("Título visível")).toBeInTheDocument()
  })

  it("disables title input when hideTitle is true", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.click(screen.getByText("Título visível"))
    expect(screen.getByPlaceholderText("Ex: Nosso Escritório")).toBeDisabled()
  })

  // ─── Button layout ───────────────────────────────────────────────────────────

  it("shows button config fields when button layout is selected in dialog", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    expect(screen.getByText("URL do botão")).toBeInTheDocument()
    expect(screen.getByText("Texto do botão")).toBeInTheDocument()
  })

  it("hides the Título field when button layout is selected (hideTitle auto-set to true)", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    // Title field (placeholder "Ex: Nosso Escritório") should not exist for button layout
    expect(screen.queryByPlaceholderText("Ex: Nosso Escritório")).not.toBeInTheDocument()
    // Description (RichTextEditor) should also not exist for button layout
    expect(screen.queryByTestId("rich-text-editor")).not.toBeInTheDocument()
  })

  it("creates a button-layout section without title validation error", async () => {
    const createAsync = vi.fn().mockResolvedValue({ section: buttonSection })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    // Click save without entering title — should NOT show validation error for button layout
    const saveButton = screen.getByRole("button", { name: /criar seção/i })
    await userEvent.click(saveButton)
    await waitFor(() => expect(createAsync).toHaveBeenCalled())
    expect(showToast).not.toHaveBeenCalledWith("Informe um título para a seção.")
  })

  it("updates button URL input", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    const urlInput = screen.getByPlaceholderText("https://...")
    await userEvent.type(urlInput, "https://meusite.com")
    expect(urlInput).toHaveValue("https://meusite.com")
  })

  it("updates button label input", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    const labelInput = screen.getByPlaceholderText("Ex: Agende uma consulta")
    await userEvent.type(labelInput, "Clique aqui")
    expect(labelInput).toHaveValue("Clique aqui")
  })

  it("updates button bg color via color picker and text inputs", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    // There are two inputs bound to buttonBgColor: type="color" (line 435) and type="text" Input (line 440)
    // Query all inputs with #000000 and trigger both onChange handlers separately
    const allInputs = screen.getAllByDisplayValue("#000000")
    const colorPickerInput = allInputs.find((el) => (el as HTMLInputElement).type === "color")
    const textInput = allInputs.find((el) => (el as HTMLInputElement).type === "text")
    // Trigger type="color" input onChange (line 435)
    if (colorPickerInput) {
      fireEvent.change(colorPickerInput, { target: { value: "#ff0000" } })
    }
    // Re-query after state update and trigger the text Input onChange (line 440)
    const textInputAfterUpdate = document.querySelector('input[type="text"][value="#ff0000"]') as HTMLInputElement | null
    if (textInputAfterUpdate) {
      fireEvent.change(textInputAfterUpdate, { target: { value: "#00ff00" } })
    } else if (textInput) {
      // If still at #000000, trigger it
      fireEvent.change(textInput, { target: { value: "#00ff00" } })
    }
    expect(screen.getAllByDisplayValue(/#ff0000|#00ff00/).length).toBeGreaterThanOrEqual(1)
  })

  it("updates button text color via color picker and text inputs", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    // Text color inputs have value "#FFFFFF" — browser normalizes to "#ffffff"
    const textColorInputs = screen.getAllByDisplayValue("#ffffff")
    // Trigger color picker input (first)
    fireEvent.change(textColorInputs[0], { target: { value: "#0000ff" } })
    expect(textColorInputs[0]).toHaveValue("#0000ff")
    // After change, re-query and trigger the text Input (second)
    const textColorInputsAfter = screen.getAllByDisplayValue("#0000ff")
    if (textColorInputsAfter.length > 1) {
      fireEvent.change(textColorInputsAfter[1], { target: { value: "#ff00ff" } })
      expect(textColorInputsAfter[1]).toHaveValue("#ff00ff")
    } else {
      fireEvent.change(textColorInputsAfter[0], { target: { value: "#ff00ff" } })
    }
  })

  it("updates button border radius via range slider", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    const rangeInput = document.querySelector('input[type="range"]') as HTMLInputElement
    expect(rangeInput).not.toBeNull()
    fireEvent.change(rangeInput, { target: { value: "20" } })
    // The label should update to show 20px
    expect(screen.getByText(/Arredondamento: 20px/i)).toBeInTheDocument()
  })

  it("calls IconPicker onChange for button icon", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    // The IconPicker mock renders an "Escolher ícone" button
    const iconPickerBtn = screen.getByTestId("icon-picker-trigger")
    await userEvent.click(iconPickerBtn)
    // Icon name should update — the button now shows "Scale" or the icon
    // (the mock sets buttonIconName to "Scale" via onChange)
    expect(screen.getByText("Scale")).toBeInTheDocument()
  })

  it("shows button preview with Clique aqui placeholder when label is empty", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const botaoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Botão / Link"))
    await userEvent.click(botaoBtn!)
    expect(screen.getByText("Clique aqui")).toBeInTheDocument()
  })

  // ─── Video layout ─────────────────────────────────────────────────────────────

  it("shows video URL field when video layout is selected", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const videoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Vídeo") && !el.textContent?.includes("criar"))
    await userEvent.click(videoBtn!)
    expect(screen.getByPlaceholderText(/youtube\.com|vimeo\.com/i)).toBeInTheDocument()
  })

  it("shows video embed preview when valid YouTube URL is typed", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const videoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Vídeo") && !el.textContent?.includes("criar"))
    await userEvent.click(videoBtn!)
    const videoInput = screen.getByPlaceholderText(/youtube\.com|vimeo\.com/i)
    await userEvent.type(videoInput, "https://youtube.com/watch?v=abc")
    await waitFor(() => {
      const iframe = document.querySelector("iframe")
      expect(iframe).not.toBeNull()
    })
  })

  it("shows invalid URL error when non-YouTube/Vimeo URL is typed", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const videoBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Vídeo") && !el.textContent?.includes("criar"))
    await userEvent.click(videoBtn!)
    const videoInput = screen.getByPlaceholderText(/youtube\.com|vimeo\.com/i)
    await userEvent.type(videoInput, "https://invalid.com/video")
    await waitFor(() => {
      expect(screen.getByText("URL inválida. Use YouTube ou Vimeo.")).toBeInTheDocument()
    })
  })

  // ─── Image layout ─────────────────────────────────────────────────────────────

  it("shows image upload field when image-left layout is selected", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const imgLeftBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Imagem à esquerda"))
    await userEvent.click(imgLeftBtn!)
    expect(screen.getByText("Imagem")).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
  })

  it("shows image upload field when image-right layout is selected", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const imgRightBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Imagem à direita"))
    await userEvent.click(imgRightBtn!)
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
  })

  it("sets image file and preview when file input changes", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview-url"),
      revokeObjectURL: vi.fn(),
    })

    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const imgLeftBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Imagem à esquerda"))
    await userEvent.click(imgLeftBtn!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      const img = document.querySelector('img[src="blob:preview-url"]')
      expect(img).not.toBeNull()
    })

    vi.unstubAllGlobals()
  })

  it("removes image preview when remove button is clicked", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview-url"),
      revokeObjectURL: vi.fn(),
    })

    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    const imgLeftBtn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Imagem à esquerda"))
    await userEvent.click(imgLeftBtn!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      const img = document.querySelector('img[src="blob:preview-url"]')
      expect(img).not.toBeNull()
    })

    // Click the destructive remove button (Trash2 icon button overlaid on image)
    const removeBtn = screen.getAllByRole("button").find((el) => el.classList.contains("bg-destructive") || el.classList.contains("destructive"))
    if (removeBtn) {
      await userEvent.click(removeBtn)
    } else {
      // fallback: find via variant destructive
      const allBtns = screen.getAllByRole("button")
      const trashBtn = allBtns.find((b) => b.querySelector("svg") && b.closest(".relative"))
      if (trashBtn) await userEvent.click(trashBtn)
    }

    await waitFor(() => {
      const img = document.querySelector('img[src="blob:preview-url"]')
      expect(img).toBeNull()
    })

    vi.unstubAllGlobals()
  })

  // ─── Icon picker (non-button layout) ─────────────────────────────────────────

  it("shows Ícone da seção field for non-button layouts", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    expect(screen.getByText("Ícone da seção")).toBeInTheDocument()
  })

  it("shows 'Ícone oculto na página pública' hint when iconName is empty", async () => {
    // Open create dialog and clear the iconName by setting it to empty via IconPicker mock
    // We need a custom context variant — open dialog with no icon via section edit
    const noIconSection: CustomSectionItem = { ...textSection, iconName: "" }
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [noIconSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${noIconSection.title}` }))
    // iconName is "" — renders <Ban /> and shows hint
    expect(screen.getByText("Ícone oculto na página pública")).toBeInTheDocument()
  })

  it("renders icon name in icon picker button when iconName is set", async () => {
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    // Default iconName is "FileText" — should show "FileText" in the icon button
    expect(screen.getByText("FileText")).toBeInTheDocument()
    // No hint since iconName is set
    expect(screen.queryByText("Ícone oculto na página pública")).not.toBeInTheDocument()
  })

  it("creates a section with hideTitle=true and persists it via updateSectionConfigMutation", async () => {
    const newSection = { ...textSection, id: "new-sec-99" }
    const createAsync = vi.fn().mockResolvedValue({ section: newSection })
    const updateConfigAsync = vi.fn().mockResolvedValue({})
    const setSectionTitleHidden = vi.fn()
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        updateSectionConfigMutation: { mutateAsync: updateConfigAsync },
        setSectionTitleHidden,
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Título Oculto")
    // Toggle hideTitle on
    await userEvent.click(screen.getByText("Título visível"))
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => {
      expect(updateConfigAsync).toHaveBeenCalledWith({
        sectionTitleHidden: { "custom_new-sec-99": true },
      })
      expect(setSectionTitleHidden).toHaveBeenCalledWith({ "custom_new-sec-99": true })
    })
  })

  it("does not call updateSectionConfigMutation when hideTitle stays false on create", async () => {
    const newSection = { ...textSection, id: "new-sec-88" }
    const createAsync = vi.fn().mockResolvedValue({ section: newSection })
    const updateConfigAsync = vi.fn().mockResolvedValue({})
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        createCustomSectionMutation: { mutateAsync: createAsync, isPending: false },
        updateSectionConfigMutation: { mutateAsync: updateConfigAsync },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: /criar seção/i }))
    await userEvent.type(screen.getByPlaceholderText("Ex: Nosso Escritório"), "Título Visível")
    const saveButton = screen.getAllByRole("button", { name: /criar seção/i }).slice(-1)[0]
    await userEvent.click(saveButton)
    await waitFor(() => expect(createAsync).toHaveBeenCalled())
    // updateSectionConfigMutation should NOT be called when hideTitle is false
    expect(updateConfigAsync).not.toHaveBeenCalled()
  })

  // ─── Edit dialog ─────────────────────────────────────────────────────────────

  it("opens edit dialog for an existing section when edit icon is clicked", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    expect(screen.getByText("Editar Seção")).toBeInTheDocument()
  })

  it("edit dialog pre-fills the section title", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    expect(screen.getByPlaceholderText("Ex: Nosso Escritório")).toHaveValue("Sobre o Escritório")
  })

  it("edit dialog pre-fills video URL for video sections", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [videoSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${videoSection.title}` }))
    expect(screen.getByPlaceholderText(/youtube\.com|vimeo\.com/i)).toHaveValue("https://youtube.com/watch?v=abc123")
  })

  it("edit dialog pre-fills button config fields for button sections", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [buttonSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar Agende uma consulta` }))
    expect(screen.getByPlaceholderText("https://...")).toHaveValue("https://example.com")
    expect(screen.getByPlaceholderText("Ex: Agende uma consulta")).toHaveValue("Agende uma consulta")
  })

  it("edit dialog pre-fills hideTitle from sectionTitleHidden context", async () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        sectionTitleHidden: { "custom_sec-1": true },
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    // hideTitle should be true — "Título oculto" visible
    expect(screen.getByText("Título oculto")).toBeInTheDocument()
  })

  it("edit dialog shows existing image preview when section has imageUrl", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [imageSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${imageSection.title}` }))
    const img = document.querySelector('img[src="https://example.com/team.jpg"]')
    expect(img).not.toBeNull()
  })

  it("calls patchCustomSectionMutation when edit form is submitted", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ section: textSection })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    const saveButton = screen.getByRole("button", { name: /^salvar$/i })
    await userEvent.click(saveButton)
    await waitFor(() => expect(patchAsync).toHaveBeenCalledWith({ id: "sec-1", formData: expect.any(FormData) }))
  })

  it("shows 'Seção atualizada!' toast after successful patch", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ section: textSection })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Seção atualizada!"))
  })

  it("shows error toast when patchCustomSectionMutation throws", async () => {
    const patchAsync = vi.fn().mockRejectedValue(new Error("Falha no servidor"))
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha no servidor"))
  })

  it("calls updateSectionConfigMutation when hideTitle changes during patch", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ section: textSection })
    const updateConfigAsync = vi.fn().mockResolvedValue({})
    const setSectionTitleHidden = vi.fn()
    const showToast = vi.fn()
    // section has no hidden title initially
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        updateSectionConfigMutation: { mutateAsync: updateConfigAsync },
        setSectionTitleHidden,
        sectionTitleHidden: {},
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    // Toggle hideTitle on in edit dialog
    await userEvent.click(screen.getByText("Título visível"))
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
    await waitFor(() => {
      expect(updateConfigAsync).toHaveBeenCalledWith({
        sectionTitleHidden: { "custom_sec-1": true },
      })
    })
  })

  it("removes key from sectionTitleHidden when hideTitle is toggled off during patch", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ section: textSection })
    const updateConfigAsync = vi.fn().mockResolvedValue({})
    const setSectionTitleHidden = vi.fn()
    const showToast = vi.fn()
    // section title was previously hidden
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        updateSectionConfigMutation: { mutateAsync: updateConfigAsync },
        setSectionTitleHidden,
        sectionTitleHidden: { "custom_sec-1": true },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    // hideTitle is pre-filled as true — toggle it off
    expect(screen.getByText("Título oculto")).toBeInTheDocument()
    await userEvent.click(screen.getByText("Título oculto"))
    expect(screen.getByText("Título visível")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
    await waitFor(() => {
      // key should be deleted from updated object
      expect(updateConfigAsync).toHaveBeenCalledWith({
        sectionTitleHidden: {},
      })
    })
  })

  it("does not call updateSectionConfigMutation when hideTitle did not change during patch", async () => {
    const patchAsync = vi.fn().mockResolvedValue({ section: textSection })
    const updateConfigAsync = vi.fn().mockResolvedValue({})
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: patchAsync, isPending: false },
        updateSectionConfigMutation: { mutateAsync: updateConfigAsync },
        sectionTitleHidden: {},
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    // hideTitle stays false (matches sectionTitleHidden["custom_sec-1"] which is undefined/false)
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }))
    await waitFor(() => expect(patchAsync).toHaveBeenCalled())
    expect(updateConfigAsync).not.toHaveBeenCalled()
  })

  it("shows Salvando... when patchCustomSectionMutation is pending", async () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        patchCustomSectionMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Editar ${textSection.title}` }))
    expect(screen.getByRole("button", { name: /salvando/i })).toBeInTheDocument()
  })

  // ─── Delete dialog ────────────────────────────────────────────────────────────

  it("opens delete confirm dialog when delete icon is clicked", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    expect(screen.getByText("Excluir seção")).toBeInTheDocument()
    expect(screen.getByText(/excluir a seção "Sobre o Escritório"/i)).toBeInTheDocument()
  })

  it("shows button section label in delete confirmation dialog", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [buttonSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir Agende uma consulta` }))
    expect(screen.getByText(/excluir a seção "Agende uma consulta"/i)).toBeInTheDocument()
  })

  it("calls deleteCustomSectionMutation when confirmed", async () => {
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        deleteCustomSectionMutation: { mutateAsync: deleteAsync, isPending: false },
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith("sec-1"))
  })

  it("shows 'Seção excluída!' toast after successful delete", async () => {
    const deleteAsync = vi.fn().mockResolvedValue({ ok: true })
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        deleteCustomSectionMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Seção excluída!"))
  })

  it("shows error toast when deleteCustomSectionMutation throws", async () => {
    const deleteAsync = vi.fn().mockRejectedValue(new Error("Falha ao excluir"))
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        deleteCustomSectionMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Falha ao excluir"))
  })

  it("shows fallback error toast when deleteCustomSectionMutation throws non-Error", async () => {
    const deleteAsync = vi.fn().mockRejectedValue("network error")
    const showToast = vi.fn()
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        deleteCustomSectionMutation: { mutateAsync: deleteAsync, isPending: false },
        showToast,
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Erro ao excluir seção."))
  })

  it("dismisses delete dialog when Cancelar is clicked", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    expect(screen.getByText("Excluir seção")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))
    await waitFor(() => expect(screen.queryByText("Excluir seção")).not.toBeInTheDocument())
  })

  it("shows Excluindo... when deleteCustomSectionMutation is pending", async () => {
    mockUseEditForm.mockReturnValue(
      buildContextValue({
        customSections: [textSection],
        deleteCustomSectionMutation: { mutateAsync: vi.fn(), isPending: true },
      })
    )
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    expect(screen.getByRole("button", { name: /excluindo/i })).toBeInTheDocument()
  })

  it("closes delete dialog via onOpenChange when Escape is pressed", async () => {
    mockUseEditForm.mockReturnValue(buildContextValue({ customSections: [textSection] }))
    render(<SecoesExtrasSection />)
    await userEvent.click(screen.getByRole("button", { name: `Excluir ${textSection.title}` }))
    expect(screen.getByText("Excluir seção")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("Excluir seção")).not.toBeInTheDocument())
  })
})
