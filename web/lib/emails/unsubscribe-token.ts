import { SignJWT, jwtVerify } from "jose"

const PURPOSE = "unsubscribe"

function secretKey(): Uint8Array | null {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null
}

/** Signed opt-out token for lifecycle e-mails (no expiry: old e-mails must keep working). Null without a secret. */
export async function signUnsubscribeToken(userId: string): Promise<string | null> {
  const key = secretKey()
  if (!key) return null
  return new SignJWT({ purpose: PURPOSE }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().sign(key)
}

/** Returns the userId when the token is valid and was issued for unsubscribing, otherwise null. */
export async function verifyUnsubscribeToken(token: string | null | undefined): Promise<string | null> {
  const key = secretKey()
  if (!key || !token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] })
    return payload.purpose === PURPOSE && typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

export function buildUnsubscribeUrl(appOrigin: string, token: string): string {
  return `${appOrigin}/api/emails/unsubscribe?token=${encodeURIComponent(token)}`
}
