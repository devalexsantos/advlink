import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import type { ProfileEditValues } from "@/app/profile/edit/types"

const mockUseEditForm = vi.hoisted(() => vi.fn())
vi.mock("@/app/profile/edit/EditFormContext", () => ({ useEditForm: mockUseEditForm }))

import SiteChecklist from "@/app/profile/edit/SiteChecklist"

const completeValues: Partial<ProfileEditValues> = {
  publicName: "Dra. Ana",
  headline: "Advocacia de Família",
  oabNumber: "123456",
  oabState: "SP",
  practiceType: "autonomo",
  whatsapp: "(11) 91234-5678",
  street: "Rua A",
}

type Ctx = {
  previewUrl: string | null
  aboutMarkdown: string
  areas: { id: string; title: string; description: string | null }[]
  customSections: { id: string; title: string; description: string | null }[]
  teamMembers: { id: string }[]
  isLoading: boolean
  isError: boolean
  data: unknown
}

const completeCtx: Ctx = {
  previewUrl: "https://s3/avatar.jpg",
  aboutMarkdown: "<p>Atuo há dez anos em família.</p>",
  areas: [{ id: "a1", title: "Família", description: "<p>Divórcio e guarda.</p>" }],
  customSections: [],
  teamMembers: [],
  isLoading: false,
  isError: false,
  data: {},
}

function Harness({ values = {}, ctx = {} }: { values?: Partial<ProfileEditValues>; ctx?: Partial<Ctx> }) {
  const form = useForm<ProfileEditValues>({ defaultValues: { ...completeValues, ...values } as ProfileEditValues })
  mockUseEditForm.mockReturnValue({ form, ...completeCtx, ...ctx })
  return <SiteChecklist />
}

describe("SiteChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it("disappears when every item is done", () => {
    const { container } = render(<Harness />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing while loading, on error or without data", () => {
    const { container, rerender } = render(<Harness ctx={{ isLoading: true }} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<Harness ctx={{ isError: true }} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<Harness ctx={{ data: undefined }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the percentage and links pending items to their tab", () => {
    render(<Harness values={{ oabNumber: "", oabState: "", whatsapp: "" }} ctx={{ previewUrl: null }} />)
    // 7 items (autonomo): photo, oab and contact pending -> 4/7 = 57%
    expect(screen.getByRole("heading", { name: "Seu site está 57% pronto" })).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "57")
    expect(screen.getByRole("link", { name: /Foto de perfil/ })).toHaveAttribute("href", "/profile/edit?tab=estilo")
    expect(screen.getByRole("link", { name: /Número da OAB preenchido/ })).toHaveAttribute("href", "/profile/edit?tab=perfil")
    expect(screen.getByRole("link", { name: /WhatsApp ou telefone/ })).toHaveAttribute("href", "/profile/edit?tab=perfil")
    expect(screen.queryByRole("link", { name: /Endereço preenchido/ })).not.toBeInTheDocument()
  })

  it("treats an empty rich-text paragraph as an empty About", () => {
    render(<Harness ctx={{ aboutMarkdown: "<p></p>" }} />)
    expect(screen.getByRole("link", { name: /Texto “Sobre” preenchido/ })).toHaveAttribute("href", "/profile/edit?tab=perfil")
  })

  it("requires an area with a description", () => {
    render(<Harness ctx={{ areas: [{ id: "a1", title: "Família", description: "" }] }} />)
    expect(screen.getByRole("link", { name: /área de atuação com descrição/ })).toHaveAttribute("href", "/profile/edit?tab=areas")
  })

  it("asks for a team member only for law firms", () => {
    const { rerender } = render(<Harness />)
    expect(screen.queryByText(/membro da equipe/)).not.toBeInTheDocument()
    rerender(<Harness key="firm" values={{ practiceType: "escritorio" }} />)
    expect(screen.getByRole("link", { name: /membro da equipe/ })).toHaveAttribute("href", "/profile/edit?tab=equipe")
  })

  it("flags OAB advertising alerts in the texts and points to the offending tab", () => {
    render(<Harness ctx={{ areas: [{ id: "a1", title: "Família", description: "Somos os melhores, consulta gratuita." }] }} />)
    const link = screen.getByRole("link", { name: /Textos sem alertas de publicidade OAB/ })
    expect(link).toHaveAttribute("href", "/profile/edit?tab=areas")
    expect(within(link).getByText(/Provimento 205\/2021/)).toBeInTheDocument()
  })

  it("also checks headline, extra sections and SEO fields", () => {
    const { rerender } = render(<Harness values={{ headline: "Especialista em tudo" }} />)
    expect(screen.getByRole("link", { name: /alertas de publicidade/ })).toHaveAttribute("href", "/profile/edit?tab=perfil")
    rerender(<Harness key="cs" ctx={{ customSections: [{ id: "c1", title: "Preços", description: "Descontos de 50%" }] }} />)
    expect(screen.getByRole("link", { name: /alertas de publicidade/ })).toHaveAttribute("href", "/profile/edit?tab=secoes-extras")
    rerender(<Harness key="seo" values={{ metaDescription: "Resultado garantido" }} />)
    expect(screen.getByRole("link", { name: /alertas de publicidade/ })).toHaveAttribute("href", "/profile/edit?tab=seo")
  })

  it("collapses and remembers the choice in localStorage", async () => {
    render(<Harness ctx={{ previewUrl: null }} />)
    expect(screen.getByRole("link", { name: /Foto de perfil/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /ocultar/i }))
    expect(screen.queryByRole("link", { name: /Foto de perfil/ })).not.toBeInTheDocument()
    expect(window.localStorage.getItem("advlink:site-checklist:collapsed")).toBe("1")
  })

  it("starts collapsed when the choice was saved", () => {
    window.localStorage.setItem("advlink:site-checklist:collapsed", "1")
    render(<Harness ctx={{ previewUrl: null }} />)
    expect(screen.queryByRole("link", { name: /Foto de perfil/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /mostrar/i })).toHaveAttribute("aria-expanded", "false")
  })

  it("works when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(<Harness ctx={{ previewUrl: null }} />)
    await userEvent.click(screen.getByRole("button", { name: /ocultar/i }))
    expect(screen.queryByRole("link", { name: /Foto de perfil/ })).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
