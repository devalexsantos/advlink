// Run with `npm test` (node:test, native TypeScript type stripping — Node >= 22.18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIRM_TTL_SECONDS, signToken, verifyToken } from "../token.ts";
import { normalizeEmail } from "../email.ts";

const SECRET = "test-secret-that-is-long-enough-0123456789";
const OTHER_SECRET = "another-secret-that-is-long-enough-987654";
const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);
const EMAIL = "pessoa@example.com";

test("confirm token round-trips before expiry", () => {
  const token = signToken({ email: EMAIL, purpose: "confirm", ttlSeconds: CONFIRM_TTL_SECONDS }, SECRET, NOW);
  assert.deepEqual(verifyToken(token, "confirm", SECRET, NOW + 47 * 3600 * 1000), { ok: true, email: EMAIL });
});

test("confirm token expires after 48h", () => {
  const token = signToken({ email: EMAIL, purpose: "confirm", ttlSeconds: CONFIRM_TTL_SECONDS }, SECRET, NOW);
  assert.deepEqual(verifyToken(token, "confirm", SECRET, NOW + 48 * 3600 * 1000), { ok: false, reason: "expired" });
});

test("confirm token without expiry is rejected", () => {
  const token = signToken({ email: EMAIL, purpose: "confirm" }, SECRET, NOW);
  assert.equal(verifyToken(token, "confirm", SECRET, NOW).ok, false);
});

test("unsubscribe token has no expiry", () => {
  const token = signToken({ email: EMAIL, purpose: "unsubscribe" }, SECRET, NOW);
  const tenYears = 10 * 365 * 24 * 3600 * 1000;
  assert.deepEqual(verifyToken(token, "unsubscribe", SECRET, NOW + tenYears), { ok: true, email: EMAIL });
});

test("purpose is bound to the signature", () => {
  const unsub = signToken({ email: EMAIL, purpose: "unsubscribe" }, SECRET, NOW);
  const confirm = signToken({ email: EMAIL, purpose: "confirm", ttlSeconds: 60 }, SECRET, NOW);
  assert.deepEqual(verifyToken(unsub, "confirm", SECRET, NOW), { ok: false, reason: "wrong_purpose" });
  assert.deepEqual(verifyToken(confirm, "unsubscribe", SECRET, NOW), { ok: false, reason: "wrong_purpose" });
});

test("tampered payload is rejected", () => {
  const token = signToken({ email: EMAIL, purpose: "confirm", ttlSeconds: 60 }, SECRET, NOW);
  const [, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ e: "atacante@example.com", p: "c", x: 9_999_999_999 })).toString(
    "base64url"
  );
  assert.deepEqual(verifyToken(`${forged}.${signature}`, "confirm", SECRET, NOW), {
    ok: false,
    reason: "bad_signature",
  });
});

test("tampered or truncated signature is rejected", () => {
  const token = signToken({ email: EMAIL, purpose: "unsubscribe" }, SECRET, NOW);
  const [payload, signature] = token.split(".");
  const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
  assert.equal(verifyToken(`${payload}.${flipped}`, "unsubscribe", SECRET, NOW).ok, false);
  assert.equal(verifyToken(`${payload}.${signature.slice(0, 10)}`, "unsubscribe", SECRET, NOW).ok, false);
});

test("token signed with another secret is rejected", () => {
  const token = signToken({ email: EMAIL, purpose: "unsubscribe" }, OTHER_SECRET, NOW);
  assert.deepEqual(verifyToken(token, "unsubscribe", SECRET, NOW), { ok: false, reason: "bad_signature" });
});

test("malformed input is rejected", () => {
  for (const bad of [undefined, null, 42, "", "abc", "a.b.c", ".", "x".repeat(5000)]) {
    assert.equal(verifyToken(bad, "confirm", SECRET, NOW).ok, false);
  }
});

test("short secrets are refused", () => {
  assert.throws(() => signToken({ email: EMAIL, purpose: "unsubscribe" }, "short"));
  assert.throws(() => verifyToken("a.b", "unsubscribe", "short"));
});

test("normalizeEmail trims, lowercases and validates", () => {
  assert.equal(normalizeEmail("  Pessoa@Example.COM "), EMAIL);
  assert.equal(normalizeEmail("sem-arroba"), null);
  assert.equal(normalizeEmail(`${"a".repeat(250)}@x.co`), null);
  assert.equal(normalizeEmail(123), null);
});
