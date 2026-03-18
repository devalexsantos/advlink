// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import type React from "react"

// ---------------------------------------------------------------------------
// Hoist mocks — all vi.mock() must precede any imports
// ---------------------------------------------------------------------------
const {
  mockGetServerSession,
  mockGetActiveSiteId,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockGetActiveSiteId: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: mockGetActiveSiteId }))
vi.mock("next/navigation", () => ({ redirect: mockRedirect }))

// Mock ProfileLayoutClient as a simple element so we can inspect its props
vi.mock("../ProfileLayoutClient", () => ({
  ProfileLayoutClient: ({
    initialSiteId,
    children,
  }: {
    initialSiteId: string | null
    children: React.ReactNode
  }) => ({ type: "ProfileLayoutClient", props: { initialSiteId, children } }),
}))

import ProfileLayout from "@/app/profile/layout"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ProfileLayout (server component)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Make redirect() throw so execution halts, mirroring real Next.js behavior
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    })
  })

  describe("unauthenticated access", () => {
    it("redirects to /login when there is no session", async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(
        ProfileLayout({ children: null })
      ).rejects.toThrow("REDIRECT:/login")
    })

    it("redirects to /login when session has no userId", async () => {
      mockGetServerSession.mockResolvedValue({ user: {} })

      await expect(
        ProfileLayout({ children: null })
      ).rejects.toThrow("REDIRECT:/login")
    })

    it("redirects to /login when session user has undefined id", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: undefined } })

      await expect(
        ProfileLayout({ children: null })
      ).rejects.toThrow("REDIRECT:/login")
    })
  })

  describe("authenticated access", () => {
    it("calls getActiveSiteId with the authenticated userId", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user-42" } })
      mockGetActiveSiteId.mockResolvedValue("site-1")

      await ProfileLayout({ children: null })

      expect(mockGetActiveSiteId).toHaveBeenCalledWith("user-42")
    })

    it("renders ProfileLayoutClient with the resolved initialSiteId", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
      mockGetActiveSiteId.mockResolvedValue("site-abc")

      const result = await ProfileLayout({ children: null }) as React.ReactElement
      // The component wraps ProfileLayoutClient inside Suspense — drill into props
      const suspense = result as { props: { children: React.ReactElement } }
      const layoutClient = suspense.props.children as {
        props: { initialSiteId: string | null }
      }
      expect(layoutClient.props.initialSiteId).toBe("site-abc")
    })

    it("renders ProfileLayoutClient with null initialSiteId when getActiveSiteId returns null", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
      mockGetActiveSiteId.mockResolvedValue(null)

      const result = await ProfileLayout({ children: null }) as React.ReactElement
      const suspense = result as { props: { children: React.ReactElement } }
      const layoutClient = suspense.props.children as {
        props: { initialSiteId: string | null }
      }
      expect(layoutClient.props.initialSiteId).toBeNull()
    })

    it("does not redirect when session has a valid userId", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
      mockGetActiveSiteId.mockResolvedValue("site-1")

      await expect(ProfileLayout({ children: null })).resolves.not.toThrow()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("passes children through to ProfileLayoutClient", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } })
      mockGetActiveSiteId.mockResolvedValue("site-1")

      const child = { type: "div", props: { children: "child content" } } as unknown as React.ReactNode
      const result = await ProfileLayout({ children: child }) as React.ReactElement
      const suspense = result as { props: { children: React.ReactElement } }
      const layoutClient = suspense.props.children as {
        props: { children: React.ReactNode }
      }
      expect(layoutClient.props.children).toBe(child)
    })
  })
})
