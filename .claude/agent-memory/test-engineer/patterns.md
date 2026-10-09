# Extended Test Patterns

## Prisma.JsonNull in tests

When a route stores `buttonConfig ?? Prisma.JsonNull`, the mock receives `Prisma.JsonNull` (a special object), NOT JS `null`.
- Do NOT assert `buttonConfig: null` — it fails
- Assert the route returns 200 and `customSection.update` was called, without inspecting the exact sentinel value:
  ```typescript
  const call = prismaMock.customSection.update.mock.calls[0][0]
  expect(call.data).toHaveProperty("buttonConfig")
  expect(call.data.buttonConfig).not.toBeNull() // It is Prisma.JsonNull, not null
  ```

## File MIME type fallback branches (|| "jpg", || "image/jpeg")

These fallback branches in routes (e.g., `imageFile.type.split("/")[1] || "jpg"`) cannot be triggered
by the standard `File` constructor in Node.js test environments. When type is passed as `""`, the runtime
still assigns `application/octet-stream`. Do NOT write tests for these branches — they are effectively
unreachable in the Vitest/Node environment. Accept that branch coverage will be ~88% on these files.

## fireEvent.change pattern for hidden file inputs (confirmed working)

```typescript
import { fireEvent } from "@testing-library/react"

const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
fireEvent.change(fileInput, { target: { files: [file] } })
```

This reliably triggers `onChange` on hidden file inputs in jsdom.

## Testing setLinkCoverPreview functional updater

The cover preview setter uses a functional updater form: `setLinkCoverPreview((prev) => { ... })`.
To test the revoke/create logic, capture the function from mock calls and invoke it manually:

```typescript
const setLinkCoverPreview = vi.fn()
// ... render and trigger ...
const previewUpdater = setLinkCoverPreview.mock.calls[0][0]
const result = previewUpdater("blob:http://localhost/old-url")
expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/old-url")
expect(result).toBe("blob:http://localhost/new-url")
```

## Dialog onOpenChange testing

Radix Dialog `onOpenChange` can be triggered by pressing `{Escape}`:
```typescript
await userEvent.keyboard("{Escape}")
await waitFor(() => expect(setEditingLink).toHaveBeenCalledWith(null))
```

## Webhook fire-and-forget async paths

The `site_published` tracking in `checkout.session.completed` runs in a `.then()` chain
that is not awaited. These branches appear uncovered in v8. This is expected — the async
path IS called (we can confirm with `trackEventMock` being called for `subscription_started`),
but the inner `.then()` runs after the test assertion window.

## Tickets route — sendTicketCreatedEmail mock

Mock the email module directly (not via path alias remapping):
```typescript
vi.mock("@/lib/emails/ticketEmails", () => ({
  sendTicketCreatedEmail: sendTicketCreatedEmailMock,
}))
```
The `sendTicketCreatedEmail` call is fire-and-forget with `.catch(console.error)` —
the mock needs to return a resolved promise so `.catch()` doesn't trigger.

## getActiveSiteId null (404) — all protected routes

Any route that calls `getActiveSiteId` must test the null case:
```typescript
getActiveSiteIdMock.mockResolvedValue(null)
// expect 404 with { error: "No site found" }
```

## Onboarding multipart/form-data content type

The onboarding route handles BOTH JSON and multipart. The multipart path is covered by
building a `FormData` request WITHOUT setting the `content-type` header — the browser
adds `multipart/form-data; boundary=...` automatically when body is `FormData`.
