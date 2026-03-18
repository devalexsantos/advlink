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

import EnderecoSection from "@/app/profile/edit/sections/EnderecoSection"

function FormWrapper({ defaults = {} }: { defaults?: Partial<ProfileEditValues> }) {
  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      publicName: "Test User",
      addressPublic: true,
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      ...defaults,
    },
  })

  mockUseEditForm.mockReturnValue({ form })

  return <EnderecoSection />
}

describe("EnderecoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the address visibility toggle label", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Mostrar Endereço?")).toBeInTheDocument()
  })

  it("renders the address visibility switch as checked by default", () => {
    render(<FormWrapper />)
    // Switch renders as a button with role="switch"
    const toggle = screen.getByRole("switch")
    expect(toggle).toBeChecked()
  })

  it("renders the address data section heading", () => {
    render(<FormWrapper />)
    expect(screen.getByText("Dados do endereço")).toBeInTheDocument()
  })

  it("renders CEP input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("CEP")).toBeInTheDocument()
  })

  it("renders Endereço (street) input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Endereço")).toBeInTheDocument()
  })

  it("renders Número input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Número")).toBeInTheDocument()
  })

  it("renders Complemento input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Complemento")).toBeInTheDocument()
  })

  it("renders Bairro input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Bairro")).toBeInTheDocument()
  })

  it("renders Cidade input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Cidade")).toBeInTheDocument()
  })

  it("renders Estado input", () => {
    render(<FormWrapper />)
    expect(screen.getByLabelText("Estado")).toBeInTheDocument()
  })

  it("Estado input has maxLength of 2 for UF abbreviation", () => {
    render(<FormWrapper />)
    const input = screen.getByLabelText("Estado")
    expect(input).toHaveAttribute("maxLength", "2")
  })

  it("allows typing a street name", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Endereço")
    await user.type(input, "Rua das Flores")
    expect(input).toHaveValue("Rua das Flores")
  })

  it("allows typing a city name", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("Cidade")
    await user.type(input, "São Paulo")
    expect(input).toHaveValue("São Paulo")
  })

  it("formats CEP with a dash after 5 digits", async () => {
    const user = userEvent.setup()
    render(<FormWrapper />)
    const input = screen.getByLabelText("CEP")
    await user.type(input, "01310100")
    expect(input).toHaveValue("01310-100")
  })

  it("renders with pre-filled address values", () => {
    render(
      <FormWrapper
        defaults={{
          zipCode: "01310-100",
          street: "Avenida Paulista",
          city: "São Paulo",
          state: "SP",
        }}
      />
    )
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-100")
    expect(screen.getByLabelText("Endereço")).toHaveValue("Avenida Paulista")
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo")
    expect(screen.getByLabelText("Estado")).toHaveValue("SP")
  })

  it("renders switch as unchecked when addressPublic is false", () => {
    render(<FormWrapper defaults={{ addressPublic: false }} />)
    const toggle = screen.getByRole("switch")
    expect(toggle).not.toBeChecked()
  })

  describe("null field values fall back to empty string (nullish coalescing branches)", () => {
    it("renders CEP input with empty string when zipCode is null/undefined", () => {
      render(<FormWrapper defaults={{ zipCode: undefined }} />)
      expect(screen.getByLabelText("CEP")).toHaveValue("")
    })

    it("renders Endereço input with empty string when street is null/undefined", () => {
      render(<FormWrapper defaults={{ street: undefined }} />)
      expect(screen.getByLabelText("Endereço")).toHaveValue("")
    })

    it("renders Número input with empty string when number is null/undefined", () => {
      render(<FormWrapper defaults={{ number: undefined }} />)
      expect(screen.getByLabelText("Número")).toHaveValue("")
    })

    it("renders Complemento input with empty string when complement is null/undefined", () => {
      render(<FormWrapper defaults={{ complement: undefined }} />)
      expect(screen.getByLabelText("Complemento")).toHaveValue("")
    })

    it("renders Bairro input with empty string when neighborhood is null/undefined", () => {
      render(<FormWrapper defaults={{ neighborhood: undefined }} />)
      expect(screen.getByLabelText("Bairro")).toHaveValue("")
    })

    it("renders Cidade input with empty string when city is null/undefined", () => {
      render(<FormWrapper defaults={{ city: undefined }} />)
      expect(screen.getByLabelText("Cidade")).toHaveValue("")
    })

    it("renders Estado input with empty string when state is null/undefined", () => {
      render(<FormWrapper defaults={{ state: undefined }} />)
      expect(screen.getByLabelText("Estado")).toHaveValue("")
    })
  })

  describe("CEP masking branch coverage", () => {
    it("does not add a dash when fewer than 5 digits are entered", async () => {
      const user = userEvent.setup()
      render(<FormWrapper />)
      const input = screen.getByLabelText("CEP")
      await user.type(input, "0131")
      // 4 digits — no dash should appear
      expect(input).toHaveValue("0131")
    })

    it("does not add a dash for exactly 5 digits", async () => {
      const user = userEvent.setup()
      render(<FormWrapper />)
      const input = screen.getByLabelText("CEP")
      await user.type(input, "01310")
      expect(input).toHaveValue("01310")
    })

    it("strips non-numeric characters from CEP input", async () => {
      const user = userEvent.setup()
      render(<FormWrapper />)
      const input = screen.getByLabelText("CEP")
      await user.type(input, "ABC123")
      expect(input).toHaveValue("123")
    })

    it("limits CEP to 9 characters (8 digits + dash)", async () => {
      const user = userEvent.setup()
      render(<FormWrapper />)
      const input = screen.getByLabelText("CEP")
      await user.type(input, "012345678999")
      // Should be capped at 8 digits → 01234-567
      expect(input).toHaveValue("01234-567")
    })
  })
})
