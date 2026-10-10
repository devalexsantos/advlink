import crypto from "crypto"

/**
 * Visitor hash: SHA-256(IP + UA + date) truncated. Rotates daily, so it can't follow a visitor
 * across days and never stores the IP itself. Server-only (node crypto).
 */
export function dailyVisitorHash(ip: string, ua: string, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10)
  return crypto.createHash("sha256").update(`${ip}|${ua}|${today}`).digest("hex").slice(0, 16)
}

/** User agents ignored by public beacons and forms (crawlers, headless browsers, CLI clients). */
export const BOT_UA_PATTERN = /bot|crawler|spider|lighthouse|headless|prerender|wget|curl|httpie/i
