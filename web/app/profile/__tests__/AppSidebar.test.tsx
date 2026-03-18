import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { signOutMock, mockRouterPush, mockSetOpenMobile, mockScrollTo } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  mockRouterPush: vi.fn(),
  mockSetOpenMobile: vi.fn(),
  mockScrollTo: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/profile/edit",
  useSearchParams: () => ({ get: () => "estilo" }),
}))

vi.mock("@/public/images/advlink-logo-black.svg", () => ({
  default: "/logo.svg",
}))

vi.mock("@/app/profile/SiteSwitcher", () => ({
  SiteSwitcher: () => <div>SiteSwitcher</div>,
}))

// Mock the sidebar to render children directly
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  useSidebar: () => ({ setOpenMobile: mockSetOpenMobile, toggleSidebar: vi.fn(), state: "expanded" }),
}))

import { AppSidebar } from "@/app/profile/AppSidebar"

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Stub window.scrollTo to avoid "not a function" errors in jsdom
    vi.stubGlobal("scrollTo", mockScrollTo)
  })

  it("renders all 9 editor items", () => {
    render(<AppSidebar />)
    const labels = ["Estilo", "Perfil e Contato", "Endereço", "Áreas ou serviços", "Galeria", "Links", "Seções Extras", "Reordenar", "SEO"]
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("renders Analytics link", () => {
    render(<AppSidebar />)
    expect(screen.getByText("Analytics")).toBeInTheDocument()
  })

  it("renders Suporte link", () => {
    render(<AppSidebar />)
    expect(screen.getByText("Suporte")).toBeInTheDocument()
  })

  it("renders Minha Conta link", () => {
    render(<AppSidebar />)
    expect(screen.getByText("Minha Conta")).toBeInTheDocument()
  })

  it("renders Sair button that calls signOut", async () => {
    render(<AppSidebar />)
    const logoutBtn = screen.getByText("Sair").closest("button")!
    await userEvent.click(logoutBtn)
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" })
  })

  describe("navigateTab (editor items)", () => {
    it("calls router.push with the correct tab when an editor item is clicked", async () => {
      render(<AppSidebar />)
      const estiloBtn = screen.getByText("Estilo").closest("button")!
      await userEvent.click(estiloBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/profile/edit?tab=estilo", { scroll: false })
    })

    it("calls setOpenMobile(false) when an editor item is clicked", async () => {
      render(<AppSidebar />)
      const perfilBtn = screen.getByText("Perfil e Contato").closest("button")!
      await userEvent.click(perfilBtn)
      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })

    it("calls window.scrollTo({ top: 0 }) when an editor item is clicked", async () => {
      render(<AppSidebar />)
      const galBtn = screen.getByText("Galeria").closest("button")!
      await userEvent.click(galBtn)
      expect(mockScrollTo).toHaveBeenCalledWith({ top: 0 })
    })

    it("navigates to the SEO tab when SEO editor item is clicked", async () => {
      render(<AppSidebar />)
      const seoBtn = screen.getByText("SEO").closest("button")!
      await userEvent.click(seoBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/profile/edit?tab=seo", { scroll: false })
    })
  })

  describe("Analytics click handler", () => {
    it("calls router.push('/profile/analytics') when Analytics is clicked", async () => {
      render(<AppSidebar />)
      const analyticsBtn = screen.getByText("Analytics").closest("button")!
      await userEvent.click(analyticsBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/profile/analytics")
    })

    it("calls setOpenMobile(false) when Analytics is clicked", async () => {
      render(<AppSidebar />)
      const analyticsBtn = screen.getByText("Analytics").closest("button")!
      await userEvent.click(analyticsBtn)
      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })
  })

  describe("Suporte click handler", () => {
    it("calls router.push('/profile/tickets') when Suporte is clicked", async () => {
      render(<AppSidebar />)
      const suporteBtn = screen.getByText("Suporte").closest("button")!
      await userEvent.click(suporteBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/profile/tickets")
    })

    it("calls setOpenMobile(false) when Suporte is clicked", async () => {
      render(<AppSidebar />)
      const suporteBtn = screen.getByText("Suporte").closest("button")!
      await userEvent.click(suporteBtn)
      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })
  })

  describe("Minha Conta click handler", () => {
    it("calls router.push('/profile/account') when Minha Conta is clicked", async () => {
      render(<AppSidebar />)
      const contaBtn = screen.getByText("Minha Conta").closest("button")!
      await userEvent.click(contaBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/profile/account")
    })

    it("calls setOpenMobile(false) when Minha Conta is clicked", async () => {
      render(<AppSidebar />)
      const contaBtn = screen.getByText("Minha Conta").closest("button")!
      await userEvent.click(contaBtn)
      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })
  })
})
