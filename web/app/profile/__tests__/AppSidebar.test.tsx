import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}))

vi.mock("@/public/images/advlink-logo-black.svg", () => ({
  default: "/logo.svg",
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
  useSidebar: () => ({ setOpenMobile: vi.fn(), toggleSidebar: vi.fn(), state: "expanded" }),
}))

import { AppSidebar } from "@/app/profile/AppSidebar"

describe("AppSidebar", () => {
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
})
