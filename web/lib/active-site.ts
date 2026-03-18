import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const COOKIE_NAME = "active-site-id"

/**
 * Get the active site ID for a user.
 * Reads from cookie, validates ownership, falls back to first profile.
 */
export async function getActiveSiteId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value

  if (cookieValue) {
    const profile = await prisma.profile.findFirst({
      where: { id: cookieValue, userId },
      select: { id: true },
    })
    if (profile) return profile.id
  }

  // Fallback: return first profile for this user
  const first = await prisma.profile.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  if (first) {
    // cookies().set() only works inside Server Actions / Route Handlers.
    // When called from a Server Component we just return the id without persisting.
    try {
      cookieStore.set(COOKIE_NAME, first.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      })
    } catch {
      // Read-only context (Server Component) — ignore
    }
  }

  return first?.id ?? null
}

/**
 * Set the active site cookie.
 */
export async function setActiveSiteCookie(siteId: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, siteId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
}
