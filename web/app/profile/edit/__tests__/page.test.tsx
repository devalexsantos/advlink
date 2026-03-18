// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import type React from "react"

// ---------------------------------------------------------------------------
// Hoist mocks — all vi.mock() must precede any imports
// ---------------------------------------------------------------------------
const {
  mockGetServerSession,
  mockPrismaProfileCount,
  mockPrismaProfileFindUnique,
  mockGetActiveSiteId,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockPrismaProfileCount: vi.fn(),
  mockPrismaProfileFindUnique: vi.fn(),
  mockGetActiveSiteId: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }))
vi.mock("@/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      count: mockPrismaProfileCount,
      findUnique: mockPrismaProfileFindUnique,
    },
  },
}))
vi.mock("@/lib/active-site", () => ({ getActiveSiteId: mockGetActiveSiteId }))
vi.mock("next/navigation", () => ({ redirect: mockRedirect }))

// Mock EditDashboard as a simple string function so JSON.stringify(result) can detect it
vi.mock("../EditDashboard", () => ({
  default: ({ isActive, slug }: { isActive: boolean; slug?: string }) =>
    `EditDashboard:isActive=${isActive}:slug=${slug ?? "undefined"}`,
}))

import ProfileEditPage from "@/app/profile/edit/page"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(userId = "user-1") {
  return { user: { id: userId } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ProfileEditPage (server component)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Make redirect() throw so execution stops like it does in real Next.js
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    })
  })

  describe("unauthenticated access", () => {
    it("redirects to /login when there is no session", async () => {
      mockGetServerSession.mockResolvedValue(null)

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/login")
    })

    it("redirects to /login when session has no userId", async () => {
      mockGetServerSession.mockResolvedValue({ user: {} })

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/login")
    })
  })

  describe("no profiles exist", () => {
    it("redirects to /onboarding/new-site when user has no profiles", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(0)

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/onboarding/new-site")
    })
  })

  describe("no active profile resolved", () => {
    it("redirects to /onboarding/new-site when getActiveSiteId returns null", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue(null)

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/onboarding/new-site")
    })
  })

  describe("profile not found or setup incomplete", () => {
    it("redirects to /onboarding/profile when profile is null", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue(null)

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/onboarding/profile")
    })

    it("redirects to /onboarding/profile when setupComplete is false", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: false,
        isActive: false,
        slug: null,
      })

      await expect(ProfileEditPage()).rejects.toThrow("REDIRECT:/onboarding/profile")
    })
  })

  describe("successful render", () => {
    it("renders EditDashboard with isActive=true and the profile slug", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: "joao-silva",
      })

      const result = await ProfileEditPage() as React.ReactElement
      expect(result.props.isActive).toBe(true)
      expect(result.props.slug).toBe("joao-silva")
    })

    it("renders EditDashboard with isActive=false when profile is not active", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: false,
        slug: "perfil-inativo",
      })

      const result = await ProfileEditPage() as React.ReactElement
      expect(result.props.isActive).toBe(false)
      expect(result.props.slug).toBe("perfil-inativo")
    })

    it("passes slug=undefined when profile slug is null", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: null,
      })

      const result = await ProfileEditPage() as React.ReactElement
      // profile.slug ?? undefined → undefined when null
      expect(result.props.slug).toBeUndefined()
    })

    it("does not redirect when setup is complete", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: "test",
      })

      // Should not throw a redirect
      await expect(ProfileEditPage()).resolves.not.toThrow()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("passes the correct userId to getActiveSiteId", async () => {
      mockGetServerSession.mockResolvedValue(makeSession("user-abc"))
      mockPrismaProfileCount.mockResolvedValue(2)
      mockGetActiveSiteId.mockResolvedValue("profile-xyz")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: "test",
      })

      await ProfileEditPage()

      expect(mockGetActiveSiteId).toHaveBeenCalledWith("user-abc")
    })

    it("queries prisma.profile.findUnique with the resolved profileId", async () => {
      mockGetServerSession.mockResolvedValue(makeSession())
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-123")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: "test",
      })

      await ProfileEditPage()

      expect(mockPrismaProfileFindUnique).toHaveBeenCalledWith({
        where: { id: "profile-123" },
        select: { setupComplete: true, isActive: true, slug: true },
      })
    })

    it("queries prisma.profile.count with the authenticated userId", async () => {
      mockGetServerSession.mockResolvedValue(makeSession("user-xyz"))
      mockPrismaProfileCount.mockResolvedValue(1)
      mockGetActiveSiteId.mockResolvedValue("profile-1")
      mockPrismaProfileFindUnique.mockResolvedValue({
        setupComplete: true,
        isActive: true,
        slug: "test",
      })

      await ProfileEditPage()

      expect(mockPrismaProfileCount).toHaveBeenCalledWith({
        where: { userId: "user-xyz" },
      })
    })
  })
})
