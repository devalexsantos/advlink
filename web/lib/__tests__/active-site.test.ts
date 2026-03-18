// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, cookiesMock } = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  }
  return {
    prismaMock: {
      profile: { findFirst: vi.fn() },
    },
    cookiesMock: vi.fn().mockResolvedValue(cookieStore),
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("next/headers", () => ({ cookies: cookiesMock }))

import { getActiveSiteId, setActiveSiteCookie } from "@/lib/active-site"

describe("getActiveSiteId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const cookieStore = { get: vi.fn(), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)
  })

  it("returns profile id from cookie when valid", async () => {
    const cookieStore = { get: vi.fn().mockReturnValue({ value: "site-1" }), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)
    prismaMock.profile.findFirst.mockResolvedValue({ id: "site-1" })

    const result = await getActiveSiteId("user-1")
    expect(result).toBe("site-1")
    expect(prismaMock.profile.findFirst).toHaveBeenCalledWith({
      where: { id: "site-1", userId: "user-1" },
      select: { id: true },
    })
  })

  it("falls back to first profile when cookie is invalid", async () => {
    const cookieStore = { get: vi.fn().mockReturnValue({ value: "bad-id" }), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)
    // First call: cookie validation fails
    prismaMock.profile.findFirst.mockResolvedValueOnce(null)
    // Second call: fallback to first profile
    prismaMock.profile.findFirst.mockResolvedValueOnce({ id: "first-site" })

    const result = await getActiveSiteId("user-1")
    expect(result).toBe("first-site")
    expect(cookieStore.set).toHaveBeenCalledWith(
      "active-site-id",
      "first-site",
      expect.objectContaining({ path: "/", httpOnly: true })
    )
  })

  it("falls back to first profile when no cookie exists", async () => {
    const cookieStore = { get: vi.fn().mockReturnValue(undefined), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)
    prismaMock.profile.findFirst.mockResolvedValue({ id: "only-site" })

    const result = await getActiveSiteId("user-1")
    expect(result).toBe("only-site")
    expect(cookieStore.set).toHaveBeenCalled()
  })

  it("returns null when user has no profiles", async () => {
    const cookieStore = { get: vi.fn().mockReturnValue(undefined), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)
    prismaMock.profile.findFirst.mockResolvedValue(null)

    const result = await getActiveSiteId("user-1")
    expect(result).toBeNull()
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})

describe("setActiveSiteCookie", () => {
  it("sets the cookie with correct params", async () => {
    const cookieStore = { get: vi.fn(), set: vi.fn() }
    cookiesMock.mockResolvedValue(cookieStore)

    await setActiveSiteCookie("site-123")
    expect(cookieStore.set).toHaveBeenCalledWith(
      "active-site-id",
      "site-123",
      expect.objectContaining({
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      })
    )
  })
})
