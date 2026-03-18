import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"

// --- hoisted mocks ----------------------------------------------------------
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

// next/navigation redirect is mocked in setup.ts but we override it here
// with a throwing mock to assert redirects in server component tests
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
}))

// AnalyticsDashboard is a client component — stub it to keep the test focused
vi.mock("@/app/profile/analytics/AnalyticsDashboard", () => ({
  default: () => <div data-testid="analytics-dashboard">AnalyticsDashboard</div>,
}))

import AnalyticsPage from "@/app/profile/analytics/page"

const SESSION = { user: { id: "user-1" } }

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // redirect throws in Next.js; simulate that behaviour so tests don't continue past it
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    })
    // Default happy-path
    mockGetServerSession.mockResolvedValue(SESSION)
    mockPrismaProfileCount.mockResolvedValue(1)
    mockGetActiveSiteId.mockResolvedValue("profile-1")
    mockPrismaProfileFindUnique.mockResolvedValue({ setupComplete: true })
  })

  it("renders the AnalyticsDashboard component for a fully set-up profile", async () => {
    render(await AnalyticsPage())
    expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument()
  })

  it("redirects to /login when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null)
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to /login when session has no userId", async () => {
    mockGetServerSession.mockResolvedValue({ user: {} })
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to /onboarding/new-site when the user has no profiles", async () => {
    mockPrismaProfileCount.mockResolvedValue(0)
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/onboarding/new-site")
  })

  it("redirects to /onboarding/new-site when getActiveSiteId returns null", async () => {
    mockGetActiveSiteId.mockResolvedValue(null)
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/onboarding/new-site")
  })

  it("redirects to /onboarding/profile when the profile is not yet set up", async () => {
    mockPrismaProfileFindUnique.mockResolvedValue({ setupComplete: false })
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/onboarding/profile")
  })

  it("redirects to /onboarding/profile when the profile record does not exist", async () => {
    mockPrismaProfileFindUnique.mockResolvedValue(null)
    await expect(AnalyticsPage()).rejects.toThrow("REDIRECT:/onboarding/profile")
  })
})
