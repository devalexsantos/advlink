import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/test/test-utils"

// Mock child components to isolate EditDashboard logic
vi.mock("../SubscribeCTA", () => ({
  default: () => <div data-testid="subscribe-cta">Sua página ainda não está publicada.</div>,
}))
vi.mock("../PublishedCTA", () => ({
  default: ({ slug }: { slug?: string }) => <div data-testid="published-cta">Seu site está publicado! Link: {slug}</div>,
}))
vi.mock("../SectionRenderer", () => ({
  default: () => <div data-testid="section-renderer">Section</div>,
}))
vi.mock("../Preview", () => ({
  default: () => <div data-testid="preview">Preview</div>,
}))
vi.mock("../../MobilePreviewContext", () => ({
  useMobilePreview: () => ({ mobilePreview: false, setMobilePreview: vi.fn() }),
}))
vi.mock("../EditFormContext", () => ({
  EditFormProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEditForm: () => ({
    saveProfileMutation: { isPending: false },
  }),
}))

import EditDashboard from "@/app/profile/edit/EditDashboard"

describe("EditDashboard", () => {
  it("shows SubscribeCTA when user is NOT active", () => {
    render(<EditDashboard isActive={false} />)
    expect(screen.getByTestId("subscribe-cta")).toBeInTheDocument()
    expect(screen.queryByTestId("published-cta")).not.toBeInTheDocument()
  })

  it("shows PublishedCTA when user IS active", () => {
    render(<EditDashboard isActive={true} slug="teste" />)
    expect(screen.getByTestId("published-cta")).toBeInTheDocument()
    expect(screen.queryByTestId("subscribe-cta")).not.toBeInTheDocument()
  })

  it("passes slug to PublishedCTA", () => {
    render(<EditDashboard isActive={true} slug="meu-site" />)
    expect(screen.getByText(/meu-site/)).toBeInTheDocument()
  })

  it("renders SectionRenderer (editor content) in desktop and mobile", () => {
    render(<EditDashboard isActive={false} />)
    const sections = screen.getAllByTestId("section-renderer")
    expect(sections.length).toBeGreaterThanOrEqual(1)
  })

  it("renders Salvar button", () => {
    render(<EditDashboard isActive={true} slug="teste" />)
    expect(screen.getByText("Salvar")).toBeInTheDocument()
  })
})
