import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test/test-utils"
import userEvent from "@testing-library/user-event"

const { editFormState } = vi.hoisted(() => ({
  editFormState: { isLoading: false, isError: false, refetchProfile: vi.fn() },
}))

// Mock child components to isolate EditDashboard logic
vi.mock("../SubscribeCTA", () => ({
  default: () => <div data-testid="subscribe-cta">Sua página ainda não está publicada.</div>,
}))
vi.mock("@/components/billing/OverdueAlert", () => ({
  default: () => <div data-testid="overdue-alert">OverdueAlert</div>,
}))
vi.mock("../PublishedCTA", () => ({
  default: ({ slug }: { slug?: string }) => <div data-testid="published-cta">Seu site está publicado! Link: {slug}</div>,
}))
vi.mock("../SiteChecklist", () => ({
  default: () => <div data-testid="site-checklist">Checklist</div>,
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
    ...editFormState,
  }),
}))

import EditDashboard from "@/app/profile/edit/EditDashboard"

describe("EditDashboard", () => {
  beforeEach(() => {
    editFormState.isLoading = false
    editFormState.isError = false
    editFormState.refetchProfile.mockClear()
  })

  it("shows a skeleton and disables saving while the profile loads", () => {
    editFormState.isLoading = true
    render(<EditDashboard isActive={true} slug="teste" />)
    expect(screen.getAllByLabelText("Carregando editor").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId("section-renderer")).not.toBeInTheDocument()
    expect(screen.getByText("Salvar").closest("button")).toBeDisabled()
  })

  it("shows an error with retry when the profile fails to load", async () => {
    editFormState.isError = true
    render(<EditDashboard isActive={true} slug="teste" />)
    const retry = screen.getAllByRole("button", { name: /tentar novamente/i })[0]
    await userEvent.click(retry)
    expect(editFormState.refetchProfile).toHaveBeenCalled()
    expect(screen.getByText("Salvar").closest("button")).toBeDisabled()
  })

  it("renders the completeness checklist below the CTAs", () => {
    render(<EditDashboard isActive={false} />)
    expect(screen.getByTestId("site-checklist")).toBeInTheDocument()
  })

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

  it("renders the overdue payment alert for a published site", () => {
    render(<EditDashboard isActive={true} slug="teste" />)
    expect(screen.getByTestId("overdue-alert")).toBeInTheDocument()
  })

  it("does not render the overdue payment alert for an unpublished site", () => {
    render(<EditDashboard isActive={false} />)
    expect(screen.queryByTestId("overdue-alert")).not.toBeInTheDocument()
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
