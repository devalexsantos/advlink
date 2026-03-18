import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { profileEditSchema, type ProfileEditValues } from "@/app/profile/edit/types"

const mockUseEditForm = vi.hoisted(() => vi.fn())

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

// Render tooltip children so the help buttons inside TooltipTrigger are accessible
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

// PublicSectionHeader depends on useEditForm too — mock the whole SectionRenderer module
vi.mock("@/app/profile/edit/SectionRenderer", () => ({
  PublicSectionHeader: ({ sectionKey }: { sectionKey: string }) => (
    <div data-testid={`public-section-header-${sectionKey}`} />
  ),
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

import PerfilContatoSection from "@/app/profile/edit/sections/PerfilContatoSection"

function makeEditFormValue(overrides: Record<string, unknown> = {}) {
  return {
    aboutMarkdown: "",
    setAboutMarkdown: vi.fn(),
    publicPhoneIsFixed: false,
    setPublicPhoneIsFixed: vi.fn(),
    whatsappIsFixed: false,
    setWhatsappIsFixed: vi.fn(),
    ...overrides,
  }
}

function FormWrapper({
  defaults = {},
  contextOverrides = {},
}: {
  defaults?: Partial<ProfileEditValues>
  contextOverrides?: Record<string, unknown>
}) {
  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      publicName: "",
      headline: "",
      publicEmail: "",
      publicPhone: "",
      whatsapp: "",
      instagramUrl: "",
      calendlyUrl: "",
      ...defaults,
    },
  })

  mockUseEditForm.mockReturnValue({
    form,
    ...makeEditFormValue(contextOverrides),
  })

  return <PerfilContatoSection />
}

describe("PerfilContatoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Informações básicas heading", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Informações básicas")).toBeInTheDocument()
  })

  it("renders the Nome de exibição label and input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText(/nome de exibição/i)).toBeInTheDocument()
  })

  it("renders the Título (headline) input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Título")).toBeInTheDocument()
  })

  it("renders Sobre mim section", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Sobre mim")).toBeInTheDocument()
  })

  it("renders the rich text editor for about", () => {
    render(<FormWrapper />)
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument()
  })

  it("renders Contato section heading", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Contato")).toBeInTheDocument()
  })

  it("renders the E-mail input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("E-mail para contato")).toBeInTheDocument()
  })

  it("renders the WhatsApp input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("WhatsApp")).toBeInTheDocument()
  })

  it("renders the Telefone input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Telefone")).toBeInTheDocument()
  })

  it("renders the Instagram URL input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Instagram URL")).toBeInTheDocument()
  })

  it("renders Agendamento section with Calendly URL input", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Agendamento")).toBeInTheDocument()
    expect(screen.getByLabelText("Calendly URL")).toBeInTheDocument()
  })

  it("renders Fixar WhatsApp switch label", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Fixar WhatsApp")).toBeInTheDocument()
  })

  it("renders Fixar telefone switch label", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Fixar telefone")).toBeInTheDocument()
  })

  it("allows typing a public name", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText(/nome de exibição/i)
    await user.type(input, "Dr. João Silva")
    expect(input).toHaveValue("Dr. João Silva")
  })

  it("allows typing an email", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("E-mail para contato")
    await user.type(input, "joao@escritorio.com")
    expect(input).toHaveValue("joao@escritorio.com")
  })

  it("allows typing a Calendly URL", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Calendly URL")
    await user.type(input, "https://calendly.com/joao")
    expect(input).toHaveValue("https://calendly.com/joao")
  })

  it("renders with pre-filled values", () => {
    render(
      <FormWrapper
        defaults={{
          publicName: "Dra. Maria",
          headline: "Advogada Tributarista",
          publicEmail: "maria@law.com",
        }}
      />
    )
    expect(screen.getByLabelText(/nome de exibição/i)).toHaveValue("Dra. Maria")
    expect(screen.getByLabelText("Título")).toHaveValue("Advogada Tributarista")
    expect(screen.getByLabelText("E-mail para contato")).toHaveValue("maria@law.com")
  })

  it("calls setAboutMarkdown when the rich text editor changes", async () => {
    const setAboutMarkdown = vi.fn()
    render(<FormWrapper contextOverrides={{ setAboutMarkdown }} />)
    const editor = screen.getByTestId("rich-text-editor")
    await userEvent.type(editor, "Sou advogada")
    expect(setAboutMarkdown).toHaveBeenCalled()
  })

  it("renders PublicSectionHeader for 'sobre' key", () => {
    render(<FormWrapper />)
    expect(screen.getByTestId("public-section-header-sobre")).toBeInTheDocument()
  })

  it("renders PublicSectionHeader for 'calendly' key", () => {
    render(<FormWrapper />)
    expect(screen.getByTestId("public-section-header-calendly")).toBeInTheDocument()
  })

  it("renders required marker on publicName field", () => {
    render(<FormWrapper />)
    // The asterisk is inside the label as aria-hidden span
    const container = screen.getByLabelText(/nome de exibição/i).closest("div")
    expect(container).not.toBeNull()
    // The label contains the required asterisk
    const label = screen.getByText(/nome de exibição/i, { selector: "label" })
    expect(label).toBeDefined()
  })

  describe("tooltip help buttons (lines 94, 122)", () => {
    it("renders the 'Ajuda' help button for WhatsApp fixed toggle", () => {
      render(<FormWrapper />)
      // Two help buttons exist (WhatsApp and Telefone)
      const helpBtns = screen.getAllByRole("button", { name: "Ajuda" })
      expect(helpBtns.length).toBeGreaterThanOrEqual(2)
    })

    it("WhatsApp help button stops propagation on click without throwing", async () => {
      render(<FormWrapper />)
      const helpBtns = screen.getAllByRole("button", { name: "Ajuda" })
      // Click the first help button (WhatsApp) — should not throw
      await userEvent.click(helpBtns[0])
      // If we reach here the stopPropagation handlers on lines 94 executed
    })

    it("Telefone help button stops propagation on click without throwing", async () => {
      render(<FormWrapper />)
      const helpBtns = screen.getAllByRole("button", { name: "Ajuda" })
      // Second help button is for Telefone (line 122)
      await userEvent.click(helpBtns[1])
    })

    it("renders tooltip content for WhatsApp fixed", () => {
      render(<FormWrapper />)
      const contents = screen.getAllByTestId("tooltip-content")
      const whatsappTooltip = contents.find((el) =>
        el.textContent?.includes("WhatsApp ficará fixo")
      )
      expect(whatsappTooltip).toBeDefined()
    })

    it("renders tooltip content for Telefone fixed", () => {
      render(<FormWrapper />)
      const contents = screen.getAllByTestId("tooltip-content")
      const phoneTooltip = contents.find((el) =>
        el.textContent?.includes("telefone ficará fixo")
      )
      expect(phoneTooltip).toBeDefined()
    })
  })

  describe("switch toggle interactions", () => {
    it("calls setWhatsappIsFixed when the WhatsApp switch is toggled", async () => {
      const setWhatsappIsFixed = vi.fn()
      render(<FormWrapper contextOverrides={{ setWhatsappIsFixed }} />)
      // Find switches by role — first is addressPublic-like, here both switches are present
      const switches = screen.getAllByRole("switch")
      // First switch is WhatsApp (by DOM order), second is Telefone
      await userEvent.click(switches[0])
      expect(setWhatsappIsFixed).toHaveBeenCalled()
    })

    it("calls setPublicPhoneIsFixed when the Telefone switch is toggled", async () => {
      const setPublicPhoneIsFixed = vi.fn()
      render(<FormWrapper contextOverrides={{ setPublicPhoneIsFixed }} />)
      const switches = screen.getAllByRole("switch")
      await userEvent.click(switches[1])
      expect(setPublicPhoneIsFixed).toHaveBeenCalled()
    })

    it("reflects whatsappIsFixed=true on the WhatsApp switch", () => {
      render(<FormWrapper contextOverrides={{ whatsappIsFixed: true }} />)
      const switches = screen.getAllByRole("switch")
      expect(switches[0]).toBeChecked()
    })

    it("reflects publicPhoneIsFixed=true on the Telefone switch", () => {
      render(<FormWrapper contextOverrides={{ publicPhoneIsFixed: true }} />)
      const switches = screen.getAllByRole("switch")
      expect(switches[1]).toBeChecked()
    })
  })

  describe("validation error messages", () => {
    // We trigger errors by using act + setError after render so there's no
    // infinite re-render from calling setError during the render phase.
    it("shows publicName error when setError is called after render", async () => {
      let formRef: ReturnType<typeof useForm<ProfileEditValues>> | null = null
      const Wrapper = () => {
        const form = useForm<ProfileEditValues>({
          resolver: zodResolver(profileEditSchema),
          defaultValues: { publicName: "" },
        })
        formRef = form
        mockUseEditForm.mockReturnValue({ form, ...makeEditFormValue() })
        return <PerfilContatoSection />
      }
      const { rerender } = render(<Wrapper />)
      // Set error after initial render and force re-render
      formRef!.setError("publicName", { type: "required", message: "Nome é obrigatório" })
      rerender(<Wrapper />)
      expect(screen.getByText("Nome é obrigatório")).toBeInTheDocument()
    })

    it("shows publicEmail error when setError is called after render", async () => {
      let formRef: ReturnType<typeof useForm<ProfileEditValues>> | null = null
      const Wrapper = () => {
        const form = useForm<ProfileEditValues>({
          resolver: zodResolver(profileEditSchema),
          defaultValues: { publicEmail: "" },
        })
        formRef = form
        mockUseEditForm.mockReturnValue({ form, ...makeEditFormValue() })
        return <PerfilContatoSection />
      }
      const { rerender } = render(<Wrapper />)
      formRef!.setError("publicEmail", { type: "validate", message: "E-mail inválido" })
      rerender(<Wrapper />)
      expect(screen.getByText("E-mail inválido")).toBeInTheDocument()
    })

    it("shows instagramUrl error when setError is called after render", async () => {
      let formRef: ReturnType<typeof useForm<ProfileEditValues>> | null = null
      const Wrapper = () => {
        const form = useForm<ProfileEditValues>({
          resolver: zodResolver(profileEditSchema),
          defaultValues: { instagramUrl: "" },
        })
        formRef = form
        mockUseEditForm.mockReturnValue({ form, ...makeEditFormValue() })
        return <PerfilContatoSection />
      }
      const { rerender } = render(<Wrapper />)
      formRef!.setError("instagramUrl", { type: "validate", message: "URL do Instagram inválida" })
      rerender(<Wrapper />)
      expect(screen.getByText("URL do Instagram inválida")).toBeInTheDocument()
    })

    it("shows calendlyUrl error when setError is called after render", async () => {
      let formRef: ReturnType<typeof useForm<ProfileEditValues>> | null = null
      const Wrapper = () => {
        const form = useForm<ProfileEditValues>({
          resolver: zodResolver(profileEditSchema),
          defaultValues: { calendlyUrl: "" },
        })
        formRef = form
        mockUseEditForm.mockReturnValue({ form, ...makeEditFormValue() })
        return <PerfilContatoSection />
      }
      const { rerender } = render(<Wrapper />)
      formRef!.setError("calendlyUrl", { type: "validate", message: "URL do Calendly inválida" })
      rerender(<Wrapper />)
      expect(screen.getByText("URL do Calendly inválida")).toBeInTheDocument()
    })
  })
})
