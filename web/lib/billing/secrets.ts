import { timingSafeEqual } from "node:crypto"

export const MIN_SECRET_LENGTH = 32

/** Constant-time string comparison (webhook tokens, cron secret). */
export function safeEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** A configured secret, or null when missing/too short (callers answer 503 instead of trusting an empty one). */
export function configuredSecret(name: string): string | null {
  const value = process.env[name]
  return value && value.length >= MIN_SECRET_LENGTH ? value : null
}
