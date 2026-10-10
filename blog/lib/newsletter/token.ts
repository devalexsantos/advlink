import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, stateless tokens for the newsletter links.
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, "newsletter:v1:" + payload)).
// The purpose is part of the signed payload, so a (non-expiring) unsubscribe token can never be
// replayed as a confirmation token, and vice versa.

export type TokenPurpose = "confirm" | "unsubscribe";

export const CONFIRM_TTL_SECONDS = 48 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 1024;
const SIGNING_PREFIX = "newsletter:v1:";

interface Payload {
  e: string; // e-mail
  p: "c" | "u"; // purpose
  x?: number; // expiry, epoch seconds
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "malformed" | "bad_signature" | "wrong_purpose" | "expired" };

function assertSecret(secret: string) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`NEWSLETTER_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(SIGNING_PREFIX + encodedPayload).digest();
}

export function signToken(
  input: { email: string; purpose: TokenPurpose; ttlSeconds?: number },
  secret: string,
  now: number = Date.now()
): string {
  assertSecret(secret);
  const payload: Payload = { e: input.email, p: input.purpose === "confirm" ? "c" : "u" };
  if (input.ttlSeconds !== undefined) payload.x = Math.floor(now / 1000) + input.ttlSeconds;
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret).toString("base64url")}`;
}

export function verifyToken(
  token: unknown,
  purpose: TokenPurpose,
  secret: string,
  now: number = Date.now()
): VerifyResult {
  assertSecret(secret);
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [encoded, signature] = parts;

  const expected = sign(encoded, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!payload || typeof payload.e !== "string" || (payload.p !== "c" && payload.p !== "u")) {
    return { ok: false, reason: "malformed" };
  }
  if (payload.p !== (purpose === "confirm" ? "c" : "u")) return { ok: false, reason: "wrong_purpose" };

  if (purpose === "confirm" && typeof payload.x !== "number") return { ok: false, reason: "malformed" };
  if (payload.x !== undefined) {
    if (typeof payload.x !== "number" || Math.floor(now / 1000) >= payload.x) {
      return { ok: false, reason: "expired" };
    }
  }
  return { ok: true, email: payload.e };
}
