// One-off migration: legacy /app/data/newsletter.json -> Resend Contacts (segment RESEND_SEGMENT_ID).
//
//   node --env-file=.env.local scripts/import-newsletter.ts ./newsletter.json [--dry-run]
//   (Node >= 22.18 runs TypeScript natively; on older Node use `npx tsx` instead of `node`.)
//
// Idempotent: contacts already in Resend are only added to the segment, and contacts that
// unsubscribed in Resend are never re-subscribed. Prints counts only, never e-mail addresses.
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { Resend } from "resend";
import { importContact } from "../lib/newsletter/contacts.ts";
import { normalizeEmail } from "../lib/newsletter/email.ts";

// Resend's default API limit is a few requests/second; each contact costs up to 3 calls.
const DELAY_MS = 1500;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: node --env-file=<env> scripts/import-newsletter.ts <newsletter.json> [--dry-run]");
    process.exit(2);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID;
  if (!dryRun && (!apiKey || !segmentId)) {
    console.error("Missing RESEND_API_KEY and/or RESEND_SEGMENT_ID in the environment.");
    process.exit(2);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf-8"));
  } catch {
    // V8's JSON errors quote part of the input, which could contain an address
    console.error("Could not read or parse the JSON file.");
    process.exit(2);
  }
  if (!Array.isArray(raw)) {
    console.error("Expected a JSON array of { email, subscribedAt } entries.");
    process.exit(2);
  }

  const counts = { read: raw.length, invalid: 0, duplicateInFile: 0, created: 0, alreadyPresent: 0, skippedUnsubscribed: 0, failed: 0 };
  const emails = new Set<string>();
  for (const entry of raw) {
    const email = normalizeEmail(typeof entry === "string" ? entry : (entry as { email?: unknown } | null)?.email);
    if (!email) counts.invalid++;
    else if (emails.has(email)) counts.duplicateInFile++;
    else emails.add(email);
  }

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, ...counts, toImport: emails.size }, null, 2));
    return;
  }

  const resend = new Resend(apiKey);
  let i = 0;
  for (const email of emails) {
    if (i++ > 0) await sleep(DELAY_MS);
    try {
      const outcome = await importContact(resend, email, segmentId!);
      if (outcome === "created") counts.created++;
      else if (outcome === "already_present") counts.alreadyPresent++;
      else counts.skippedUnsubscribed++;
    } catch (err) {
      counts.failed++;
      // Error messages from contacts.ts never contain the address
      console.error(`#${i} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  console.log(JSON.stringify(counts, null, 2));
  if (counts.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
