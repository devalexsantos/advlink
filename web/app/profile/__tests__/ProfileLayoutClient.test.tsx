import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"

// ── Sidebar UI primitives ─────────────────────────────────────────────────────
vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button aria-label="toggle sidebar" />,
  Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  useSidebar: () => ({ setOpenMobile: vi.fn(), toggleSidebar: vi.fn(), state: "expanded" }),
}))

// ── AppSidebar ────────────────────────────────────────────────────────────────
vi.mock("@/app/profile/AppSidebar", () => ({
  AppSidebar: () => <nav aria-label="app sidebar" />,
}))

// ── MobilePreviewToggle ───────────────────────────────────────────────────────
vi.mock("@/app/profile/MobilePreviewToggle", () => ({
  MobilePreviewToggle: () => <button>Pré-visualizar</button>,
}))

// ── SiteContext ───────────────────────────────────────────────────────────────
vi.mock("@/app/profile/SiteContext", () => ({
  SiteProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// ── SVG logo asset ────────────────────────────────────────────────────────────
vi.mock("@/public/images/advlink-logo-black.svg", () => ({
  default: "/logo.svg",
}))

// ── SiteSwitcher (pulled in transitively through AppSidebar mock, but kept for safety) ──
vi.mock("@/app/profile/SiteSwitcher", () => ({
  SiteSwitcher: () => <div>SiteSwitcher</div>,
}))

import { ProfileLayoutClient } from "@/app/profile/ProfileLayoutClient"

describe("ProfileLayoutClient", () => {
  it("renders children", () => {
    render(
      <ProfileLayoutClient initialSiteId={null}>
        <p>página filho</p>
      </ProfileLayoutClient>
    )
    expect(screen.getByText("página filho")).toBeInTheDocument()
  })

  it("renders the AppSidebar", () => {
    render(
      <ProfileLayoutClient initialSiteId={null}>
        <div />
      </ProfileLayoutClient>
    )
    expect(screen.getByRole("navigation", { name: "app sidebar" })).toBeInTheDocument()
  })

  it("renders the AdvLink brand name in the mobile header", () => {
    render(
      <ProfileLayoutClient initialSiteId={null}>
        <div />
      </ProfileLayoutClient>
    )
    expect(screen.getByText("AdvLink")).toBeInTheDocument()
  })

  it("renders the MobilePreviewToggle in the header", () => {
    render(
      <ProfileLayoutClient initialSiteId={null}>
        <div />
      </ProfileLayoutClient>
    )
    expect(screen.getByRole("button", { name: /pré-visualizar/i })).toBeInTheDocument()
  })

  it("renders the sidebar trigger button", () => {
    render(
      <ProfileLayoutClient initialSiteId={null}>
        <div />
      </ProfileLayoutClient>
    )
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument()
  })

  it("accepts a non-null initialSiteId without errors", () => {
    render(
      <ProfileLayoutClient initialSiteId="site-abc">
        <p>conteúdo</p>
      </ProfileLayoutClient>
    )
    expect(screen.getByText("conteúdo")).toBeInTheDocument()
  })
})
