@AGENTS.md

## Newsletter (Resend, double opt-in)

Subscribers are stored in **Resend Contacts**, grouped in one Segment. Nothing is written to disk.

- **Flow:** `components/NewsletterForm.tsx` → `POST /api/newsletter` (honeypot, 5 req/IP/h, 1 e-mail per address every 10 min, same response whether the address exists or not) → confirmation e-mail with a signed link (48h) → `/newsletter/confirmar?token=...` → button (server action) creates/re-activates the contact in the segment and sends the welcome e-mail with the unsubscribe link → `/newsletter/descadastro?token=...` → button marks the contact `unsubscribed`. The welcome e-mail also carries `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) pointing to `POST /api/newsletter/unsubscribe?token=...`.
- State never changes on a GET (link scanners prefetch URLs): pages only render a button.
- **Code:** `lib/newsletter/token.ts` (pure HMAC-SHA256 tokens, purpose-bound, `timingSafeEqual`), `contacts.ts` (Resend Contacts ops), `emails.ts` (HTML + text), `service.ts` (flows), `config.ts` (env). `token.ts`, `email.ts` and `contacts.ts` use relative imports only, so the import script can load them under plain Node.
- **Tests:** `npm test` (node:test with native TypeScript, Node >= 22.18) — `lib/newsletter/__tests__/`.
- **Env:** `RESEND_API_KEY`, `RESEND_SEGMENT_ID` (alias `RESEND_AUDIENCE_ID`), `NEWSLETTER_FROM` (verified domain), `NEWSLETTER_SECRET` (>= 32 chars; rotating it invalidates pending confirmations and every unsubscribe link already sent), optional `NEWSLETTER_BASE_URL` (default `https://blog.advlink.site`). Without them the form answers 503.
- **Bulk sends (future):** use Resend **Broadcasts** targeting the segment and put `{{{RESEND_UNSUBSCRIBE_URL}}}` in the template — Resend fills in a per-recipient link and sets the contact `unsubscribed`, the same flag our `/newsletter/descadastro` page uses. Never send newsletters through `emails.send` in a loop.
- **Legacy JSON migration (one-off):** the old route wrote `/app/data/newsletter.json` on a persistent volume. Import it with `node --env-file=<env file> scripts/import-newsletter.ts <file.json> [--dry-run]` (or `npm run import-newsletter -- <file.json>` with the env vars already exported). Idempotent; never re-subscribes contacts that unsubscribed in Resend; prints counts only. Nothing else in the blog uses `/app/data`, so after the import the Easypanel volume can be removed (delete the copied JSON afterwards — it contains personal data).
