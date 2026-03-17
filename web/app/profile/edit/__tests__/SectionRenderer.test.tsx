import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock all section components
vi.mock("../sections/EstiloSection", () => ({ default: () => <div data-testid="estilo-section" /> }))
vi.mock("../sections/PerfilContatoSection", () => ({ default: () => <div data-testid="perfil-section" /> }))
vi.mock("../sections/EnderecoSection", () => ({ default: () => <div data-testid="endereco-section" /> }))
vi.mock("../sections/AreasServicosSection", () => ({ default: () => <div data-testid="areas-section" /> }))
vi.mock("../sections/GaleriaSection", () => ({ default: () => <div data-testid="galeria-section" /> }))
vi.mock("../sections/LinksSection", () => ({ default: () => <div data-testid="links-section" /> }))
vi.mock("../sections/SecoesExtrasSection", () => ({ default: () => <div data-testid="secoes-extras-section" /> }))
vi.mock("../sections/ReordenarSection", () => ({ default: () => <div data-testid="reordenar-section" /> }))
vi.mock("../sections/SEOSection", () => ({ default: () => <div data-testid="seo-section" /> }))
vi.mock("../EditFormContext", () => ({
  useEditForm: () => ({
    sectionLabels: {},
    setSectionLabels: vi.fn(),
    sectionIcons: {},
    setSectionIcons: vi.fn(),
    sectionTitleHidden: {},
    setSectionTitleHidden: vi.fn(),
    updateSectionConfigMutation: { mutate: vi.fn() },
  }),
}))
vi.mock("@/components/ui/icon-picker", () => ({
  IconPicker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockSearchParams = vi.fn()
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockSearchParams,
  }),
}))

import SectionRenderer from "@/app/profile/edit/SectionRenderer"

describe("SectionRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders EstiloSection by default", () => {
    mockSearchParams.mockReturnValue(null)
    render(<SectionRenderer />)
    expect(screen.getByTestId("estilo-section")).toBeInTheDocument()
    expect(screen.getByText("Estilo")).toBeInTheDocument()
  })

  it("renders PerfilContatoSection for ?tab=perfil", () => {
    mockSearchParams.mockReturnValue("perfil")
    render(<SectionRenderer />)
    expect(screen.getByTestId("perfil-section")).toBeInTheDocument()
    expect(screen.getByText("Perfil e Contato")).toBeInTheDocument()
  })

  it("renders EnderecoSection for ?tab=endereco", () => {
    mockSearchParams.mockReturnValue("endereco")
    render(<SectionRenderer />)
    expect(screen.getByTestId("endereco-section")).toBeInTheDocument()
  })

  it("renders AreasServicosSection for ?tab=areas", () => {
    mockSearchParams.mockReturnValue("areas")
    render(<SectionRenderer />)
    expect(screen.getByTestId("areas-section")).toBeInTheDocument()
  })

  it("renders GaleriaSection for ?tab=galeria", () => {
    mockSearchParams.mockReturnValue("galeria")
    render(<SectionRenderer />)
    expect(screen.getByTestId("galeria-section")).toBeInTheDocument()
  })

  it("renders LinksSection for ?tab=links", () => {
    mockSearchParams.mockReturnValue("links")
    render(<SectionRenderer />)
    expect(screen.getByTestId("links-section")).toBeInTheDocument()
  })

  it("renders SEOSection for ?tab=seo", () => {
    mockSearchParams.mockReturnValue("seo")
    render(<SectionRenderer />)
    expect(screen.getByTestId("seo-section")).toBeInTheDocument()
  })

  it("renders ReordenarSection for ?tab=reordenar", () => {
    mockSearchParams.mockReturnValue("reordenar")
    render(<SectionRenderer />)
    expect(screen.getByTestId("reordenar-section")).toBeInTheDocument()
  })

  it("falls back to EstiloSection for unknown tab", () => {
    mockSearchParams.mockReturnValue("unknown")
    render(<SectionRenderer />)
    expect(screen.getByTestId("estilo-section")).toBeInTheDocument()
  })
})
