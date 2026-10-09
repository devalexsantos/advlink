# Backend Engineer Memory

## Multi-Tenant Migration (1:N User:Profile)
- All API routes now use `getActiveSiteId(userId)` from `@/lib/active-site` to resolve active profileId
- Test files must mock `@/lib/active-site` with `getActiveSiteIdMock.mockResolvedValue("profile-1")`
- Pattern: add to `vi.hoisted()`, add `vi.mock(...)`, add to each `beforeEach`
- Entity ownership queries changed from `userId` to `profileId` (activityAreas, links, gallery, customSection)
- Profile route uses `profile.update` (not `upsert`) since profiles are pre-created
- Onboarding route uses `profile.update` (not `upsert`)
- Stripe webhook uses `profile.updateMany` by `stripeSubscriptionId` (not `user.updateMany` by `stripeCustomerId`)
- Public page checks `profile.isActive` directly (not `profile.user.isActive`)
- Checkout metadata includes `profileId` for per-site activation

## Test Setup
- Vitest config: `web/vitest.config.ts`, setup file: `web/test/setup.ts`
- `next/navigation` hooks are globally mocked in setup.ts
- Node API route tests use `// @vitest-environment node` directive
- Global test env is jsdom (from vitest.config.ts)

## Key File Paths
- Active site resolver: `web/lib/active-site.ts`
- Prisma schema: `web/prisma/schema.prisma`
- Profile route: `web/app/api/profile/route.ts`
- Onboarding route: `web/app/api/onboarding/profile/route.ts`
- Stripe webhook: `web/app/api/stripe/webhook/route.ts`
