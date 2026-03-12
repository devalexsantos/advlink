import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const ADMIN_COOKIE = "admin-token"
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "admin-secret-change-me"
)

export interface AdminPayload {
  adminId: string
  email: string
  role: string
}

export async function createAdminToken(payload: AdminPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return null

  const payload = await verifyAdminToken(token)
  if (!payload) return null

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.adminId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (!admin || !admin.isActive) return null
  return admin
}

/** Verify admin token from raw cookie value (for middleware — no Prisma) */
export async function verifyAdminTokenEdge(token: string) {
  return verifyAdminToken(token)
}

export { ADMIN_COOKIE }
