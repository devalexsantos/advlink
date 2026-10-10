// Pure helpers shared by the API route, the server actions and scripts/import-newsletter.ts.
// No "@/" imports here: the import script runs under plain Node.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 254;

/** Trims and lowercases; returns null when the address is not plausibly valid. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) return null;
  return email;
}
