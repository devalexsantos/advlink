import { Resend } from "resend";
import { SITE_URL } from "@/lib/constants";
import { MIN_SECRET_LENGTH } from "./token";

export interface NewsletterConfig {
  resend: Resend;
  segmentId: string;
  from: string;
  secret: string;
  baseUrl: string;
}

let cached: NewsletterConfig | null = null;

/**
 * Reads the newsletter env vars. Returns null (and logs the missing variable names, never values)
 * when the integration is not configured, so callers can answer 503 instead of crashing.
 */
export function getNewsletterConfig(): NewsletterConfig | null {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  // Resend renamed Audiences to Segments (Nov 2025); legacy audience IDs are valid segment IDs.
  const segmentId = process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID;
  const from = process.env.NEWSLETTER_FROM;
  const secret = process.env.NEWSLETTER_SECRET;

  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!segmentId) missing.push("RESEND_SEGMENT_ID");
  if (!from) missing.push("NEWSLETTER_FROM");
  if (!secret || secret.length < MIN_SECRET_LENGTH) missing.push(`NEWSLETTER_SECRET (>= ${MIN_SECRET_LENGTH} chars)`);
  if (missing.length > 0) {
    console.error(`[newsletter] not configured, missing: ${missing.join(", ")}`);
    return null;
  }

  cached = {
    resend: new Resend(apiKey),
    segmentId: segmentId!,
    from: from!,
    secret: secret!,
    baseUrl: (process.env.NEWSLETTER_BASE_URL || SITE_URL).replace(/\/+$/, ""),
  };
  return cached;
}

/** Secret only, for pages that just need to pre-check a token signature. */
export function getNewsletterSecret(): string | null {
  const secret = process.env.NEWSLETTER_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}
