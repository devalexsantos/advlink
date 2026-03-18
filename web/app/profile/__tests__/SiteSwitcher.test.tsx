import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const {
  mockUseSite,
  mockUseSidebar,
  mockRouterPush,
  mockSwitchSite,
} = vi.hoisted(() => {
  const mockSwitchSite = vi.fn()
  const mockRouterPush = vi.fn()
  return {
    mockUseSite: vi.fn(),
    mockUseSidebar: vi.fn(),
    mockRouterPush,
    mockSwitchSite,
  }
})

vi.mock("@/app/profile/SiteContext", () => ({
  useSite: mockUseSite,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: mockUseSidebar,
}))

// Mock dropdown menu components to render children directly and make items interactive
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string; className?: string }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <button role="menuitem" onClick={onClick} className={className}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}))

import { SiteSwitcher } from "@/app/profile/SiteSwitcher"

const baseSites = [
  {
    id: "site-1",
    name: "Escritório SP",
    publicName: "Dr. João - SP",
    slug: "joao-sp",
    isActive: true,
    setupComplete: true,
    avatarUrl: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "site-2",
    name: null,
    publicName: "Site Pessoal",
    slug: "joao-pessoal",
    isActive: false,
    setupComplete: false,
    avatarUrl: null,
    createdAt: "2024-02-01T00:00:00.000Z",
  },
]

function setupDefaults({
  sites = baseSites,
  activeSiteId = "site-1",
  sidebarState = "expanded",
}: {
  sites?: typeof baseSites
  activeSiteId?: string
  sidebarState?: "expanded" | "collapsed"
} = {}) {
  const activeSite = sites.find((s) => s.id === activeSiteId)
  mockUseSite.mockReturnValue({
    sites,
    activeSiteId,
    activeSite,
    isLoading: false,
    switchSite: mockSwitchSite,
    refetchSites: vi.fn(),
  })
  mockUseSidebar.mockReturnValue({ state: sidebarState })
}

describe("SiteSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("trigger button display", () => {
    it("renders the active site name in the trigger button when name is set", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      // The trigger is the first button rendered (the DropdownMenuTrigger wraps it)
      // The site name appears both in the trigger span and the dropdown item span.
      // We assert that at least one element with the name exists (which the trigger provides).
      const matches = screen.getAllByText("Escritório SP")
      // One in the trigger, one in the dropdown list
      expect(matches.length).toBeGreaterThanOrEqual(1)
      // Specifically the trigger span has font-medium class
      const triggerSpan = matches.find((el) =>
        el.classList.contains("font-medium")
      )
      expect(triggerSpan).toBeInTheDocument()
    })

    it("falls back to publicName when name is null", () => {
      setupDefaults({ activeSiteId: "site-2" })
      render(<SiteSwitcher />)
      // "Site Pessoal" is the publicName of site-2 — it appears in the trigger AND the list
      const matches = screen.getAllByText("Site Pessoal")
      const triggerSpan = matches.find((el) => el.classList.contains("font-medium"))
      expect(triggerSpan).toBeInTheDocument()
    })

    it("falls back to 'Meu site' when both name and publicName are null", () => {
      const sites = [
        {
          id: "site-3",
          name: null,
          publicName: null,
          slug: null,
          isActive: false,
          setupComplete: false,
          avatarUrl: null,
          createdAt: "2024-03-01T00:00:00.000Z",
        },
      ]
      setupDefaults({ sites, activeSiteId: "site-3" })
      render(<SiteSwitcher />)
      // "Meu site" only appears in the trigger, because the dropdown item shows "Sem nome"
      expect(screen.getByText("Meu site")).toBeInTheDocument()
    })

    it("does not render the trigger display name span when sidebar is collapsed", () => {
      setupDefaults({ sidebarState: "collapsed" })
      render(<SiteSwitcher />)
      // In collapsed state the conditional block is removed, so the font-medium span
      // (which is inside the !collapsed branch) should not be present.
      const allMatches = screen.queryAllByText("Escritório SP")
      const triggerSpan = allMatches.find((el) => el.classList.contains("font-medium"))
      expect(triggerSpan).toBeUndefined()
    })
  })

  describe("site list in dropdown", () => {
    it("renders all sites as menu items", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      const items = screen.getAllByRole("menuitem")
      // Two sites + "Criar novo site"
      expect(items).toHaveLength(3)
    })

    it("renders site name for each site in the dropdown list", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      // "Escritório SP" appears in both trigger and list — getAllByText handles both
      expect(screen.getAllByText("Escritório SP").length).toBeGreaterThanOrEqual(1)
      // "Site Pessoal" only in the list (site-2 is not active, so not shown in trigger)
      expect(screen.getByText("Site Pessoal")).toBeInTheDocument()
    })

    it("renders 'Sem nome' for sites with no name and no publicName", () => {
      const sites = [
        {
          id: "site-1",
          name: null,
          publicName: null,
          slug: null,
          isActive: false,
          setupComplete: false,
          avatarUrl: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ]
      setupDefaults({ sites, activeSiteId: "site-1" })
      render(<SiteSwitcher />)
      expect(screen.getByText("Sem nome")).toBeInTheDocument()
    })

    it("shows green indicator for active (isActive=true) sites", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      const greenIndicators = document.querySelectorAll(".bg-emerald-500")
      expect(greenIndicators.length).toBeGreaterThan(0)
    })

    it("shows gray indicator for inactive (isActive=false) sites", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      const grayIndicators = document.querySelectorAll(".bg-zinc-300")
      expect(grayIndicators.length).toBeGreaterThan(0)
    })

    it("shows 'atual' label next to the currently active site", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      expect(screen.getByText("atual")).toBeInTheDocument()
    })

    it("does not show 'atual' for sites that are not the active one", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      // Only one "atual" badge should exist
      expect(screen.getAllByText("atual")).toHaveLength(1)
    })
  })

  describe("site switching", () => {
    it("calls switchSite with the site id when clicking a non-active site", async () => {
      setupDefaults()
      render(<SiteSwitcher />)
      // "Site Pessoal" is site-2, which is not the active site
      const sitePessoalItem = screen.getByText("Site Pessoal").closest("button")!
      await userEvent.click(sitePessoalItem)
      expect(mockSwitchSite).toHaveBeenCalledWith("site-2")
    })

    it("does not call switchSite when clicking the already active site", async () => {
      setupDefaults()
      render(<SiteSwitcher />)
      // Find the menuitem button that contains the "atual" badge — that's the active site item
      const atualBadge = screen.getByText("atual")
      const activeItem = atualBadge.closest("[role='menuitem']")!
      await userEvent.click(activeItem)
      expect(mockSwitchSite).not.toHaveBeenCalled()
    })
  })

  describe("Criar novo site action", () => {
    it("renders the 'Criar novo site' menu item", () => {
      setupDefaults()
      render(<SiteSwitcher />)
      expect(screen.getByText("Criar novo site")).toBeInTheDocument()
    })

    it("navigates to /onboarding/new-site when clicked", async () => {
      setupDefaults()
      render(<SiteSwitcher />)
      const criarBtn = screen.getByText("Criar novo site").closest("button")!
      await userEvent.click(criarBtn)
      expect(mockRouterPush).toHaveBeenCalledWith("/onboarding/new-site")
    })
  })

  describe("empty sites list", () => {
    it("renders only the 'Criar novo site' item when there are no sites", () => {
      mockUseSite.mockReturnValue({
        sites: [],
        activeSiteId: null,
        activeSite: undefined,
        isLoading: false,
        switchSite: mockSwitchSite,
        refetchSites: vi.fn(),
      })
      mockUseSidebar.mockReturnValue({ state: "expanded" })
      render(<SiteSwitcher />)
      const items = screen.getAllByRole("menuitem")
      expect(items).toHaveLength(1)
      expect(screen.getByText("Criar novo site")).toBeInTheDocument()
    })

    it("shows 'Meu site' fallback in trigger when there is no active site", () => {
      mockUseSite.mockReturnValue({
        sites: [],
        activeSiteId: null,
        activeSite: undefined,
        isLoading: false,
        switchSite: mockSwitchSite,
        refetchSites: vi.fn(),
      })
      mockUseSidebar.mockReturnValue({ state: "expanded" })
      render(<SiteSwitcher />)
      expect(screen.getByText("Meu site")).toBeInTheDocument()
    })
  })
})
