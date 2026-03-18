import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { profileEditSchema, type ProfileEditValues } from "@/app/profile/edit/types"

// Must be hoisted before imports of the component
const mockUseEditForm = vi.hoisted(() => vi.fn())

vi.mock("@/app/profile/edit/EditFormContext", () => ({
  useEditForm: mockUseEditForm,
}))

import SEOSection from "@/app/profile/edit/sections/SEOSection"

function buildForm(defaults: Partial<ProfileEditValues> = {}) {
  // Use a wrapper component so we can render with a real react-hook-form instance
  return {
    ...defaults,
  }
}

// Helper: renders SEOSection with a real RHF form wired to useEditForm mock
function FormWrapper({ defaults = {} }: { defaults?: Partial<ProfileEditValues> }) {
  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      publicName: "Test User",
      metaTitle: "",
      metaDescription: "",
      keywords: "",
      gtmContainerId: "",
      ...defaults,
    },
  })

  mockUseEditForm.mockReturnValue({ form })

  return <SEOSection />
}

describe("SEOSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the Meta Tags section heading", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Meta Tags")).toBeInTheDocument()
  })

  it("renders the Meta Title input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Meta Title")).toBeInTheDocument()
  })

  it("renders the Meta Description textarea", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Meta Description")).toBeInTheDocument()
  })

  it("renders the Keywords section heading", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Palavras-chave")).toBeInTheDocument()
  })

  it("renders the Keywords input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Keywords")).toBeInTheDocument()
  })

  it("renders the Google Tag Manager section heading", () => {
    render(<FormWrapper />)
    // The text appears both as a heading label and inside a link — getAllByText guards against that
    const items = screen.getAllByText("Google Tag Manager")
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it("renders the GTM Container ID input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Container ID")).toBeInTheDocument()
  })

  it("shows Google Tag Manager link", () => {
    render(<FormWrapper />)
    const link = screen.getByRole("link", { name: /google tag manager/i })
    expect(link).toHaveAttribute("href", "https://tagmanager.google.com")
  })

  it("shows hint text about comma-separated keywords", () => {
    render(<FormWrapper />)
    expect(screen.getByText(/separe por vírgulas/i)).toBeInTheDocument()
  })

  it("allows typing in the Meta Title input", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Meta Title")
    await user.type(input, "Advogado Especialista")
    expect(input).toHaveValue("Advogado Especialista")
  })

  it("allows typing in the Meta Description textarea", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const textarea = screen.getByLabelText("Meta Description")
    await user.type(textarea, "Uma descrição persuasiva")
    expect(textarea).toHaveValue("Uma descrição persuasiva")
  })

  it("allows typing in the Keywords input", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Keywords")
    await user.type(input, "direito civil, advocacia")
    expect(input).toHaveValue("direito civil, advocacia")
  })

  it("allows typing in the GTM Container ID input", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Container ID")
    await user.type(input, "GTM-XXXXXXX")
    expect(input).toHaveValue("GTM-XXXXXXX")
  })

  it("renders with pre-filled default values", () => {
    render(
      <FormWrapper
        defaults={{
          metaTitle: "Meu Título SEO",
          keywords: "advocacia, direito",
          gtmContainerId: "GTM-ABC123",
        }}
      />
    )
    expect(screen.getByLabelText("Meta Title")).toHaveValue("Meu Título SEO")
    expect(screen.getByLabelText("Keywords")).toHaveValue("advocacia, direito")
    expect(screen.getByLabelText("Container ID")).toHaveValue("GTM-ABC123")
  })

  it("Meta Title input respects maxLength of 80", () => {
    render(<FormWrapper />)
    const input = screen.getByLabelText("Meta Title")
    expect(input).toHaveAttribute("maxLength", "80")
  })

  it("Meta Description textarea has 3 rows", () => {
    render(<FormWrapper />)
    const textarea = screen.getByLabelText("Meta Description")
    expect(textarea).toHaveAttribute("rows", "3")
  })
})
