// Edge-safe (used by proxy.ts): no Node/Prisma imports here.
const DEV_FALLBACK = "dev-only-admin-secret-not-for-production-use"
const MIN_LENGTH = 32

let cached: Uint8Array | null = null

/**
 * Key for the admin JWT. Fails closed in production when ADMIN_JWT_SECRET is missing or
 * shorter than 32 chars — a guessable key would let anyone forge an admin session.
 */
export function getAdminJwtSecret(): Uint8Array {
  if (cached) return cached
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret || secret.length < MIN_LENGTH) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`ADMIN_JWT_SECRET ausente ou com menos de ${MIN_LENGTH} caracteres`)
    }
    return new TextEncoder().encode(secret || DEV_FALLBACK)
  }
  cached = new TextEncoder().encode(secret)
  return cached
}
