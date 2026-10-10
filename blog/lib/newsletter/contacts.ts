import { Resend } from "resend";

// Subscriber storage lives in Resend Contacts (one global contact per e-mail, grouped in a Segment).
// No "@/" imports here: scripts/import-newsletter.ts loads this file under plain Node.
// Errors never include the e-mail address, so they are safe to log.

export class ResendContactError extends Error {
  constructor(operation: string, name: string, statusCode: number | null) {
    super(`Resend ${operation} failed: ${name} (${statusCode ?? "no status"})`);
    this.name = "ResendContactError";
  }
}

type ApiError = { name: string; statusCode: number | null } | null;

function fail(operation: string, error: NonNullable<ApiError>): never {
  throw new ResendContactError(operation, error.name, error.statusCode);
}

async function findContact(resend: Resend, email: string) {
  const { data, error } = await resend.contacts.get({ email });
  if (error) {
    if (error.name === "not_found" || error.statusCode === 404) return null;
    fail("contacts.get", error);
  }
  return data;
}

async function ensureInSegment(resend: Resend, email: string, segmentId: string) {
  const { data, error } = await resend.contacts.segments.list({ email, limit: 100 });
  if (error) fail("contacts.segments.list", error);
  if (data.data.some((segment) => segment.id === segmentId)) return;
  const added = await resend.contacts.segments.add({ email, segmentId });
  if (added.error) fail("contacts.segments.add", added.error);
}

/** Double opt-in confirmed: create the contact or re-activate it, and make sure it is in the segment. */
export async function subscribeContact(
  resend: Resend,
  email: string,
  segmentId: string
): Promise<"created" | "reactivated" | "already_active"> {
  const existing = await findContact(resend, email);
  if (!existing) {
    const { error } = await resend.contacts.create({ email, unsubscribed: false, segments: [{ id: segmentId }] });
    if (error) fail("contacts.create", error);
    return "created";
  }
  await ensureInSegment(resend, email, segmentId);
  if (!existing.unsubscribed) return "already_active";
  const { error } = await resend.contacts.update({ email, unsubscribed: false });
  if (error) fail("contacts.update", error);
  return "reactivated";
}

/** Legacy import: never re-subscribes someone who already opted out in Resend. */
export async function importContact(
  resend: Resend,
  email: string,
  segmentId: string
): Promise<"created" | "already_present" | "skipped_unsubscribed"> {
  const existing = await findContact(resend, email);
  if (!existing) {
    const { error } = await resend.contacts.create({ email, unsubscribed: false, segments: [{ id: segmentId }] });
    if (error) fail("contacts.create", error);
    return "created";
  }
  if (existing.unsubscribed) return "skipped_unsubscribed";
  await ensureInSegment(resend, email, segmentId);
  return "already_present";
}

/** Marks the contact as unsubscribed (applies to every Resend broadcast). Idempotent. */
export async function unsubscribeContact(resend: Resend, email: string): Promise<"unsubscribed" | "not_found"> {
  const existing = await findContact(resend, email);
  if (!existing) return "not_found";
  if (existing.unsubscribed) return "unsubscribed";
  const { error } = await resend.contacts.update({ email, unsubscribed: true });
  if (error) fail("contacts.update", error);
  return "unsubscribed";
}
