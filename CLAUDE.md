# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with multiple services.

```
/
├── web/                    ← Next.js 16 app (AdvLink) — app.advlink.site + *.advlink.site
├── lp/                     ← Static landing page (HTML/CSS/Nginx, Dockerized) — advlink.site
├── blog/                   ← Next.js 16 + MDX blog — blog.advlink.site (has its own CLAUDE.md)
├── docs/                   ← planning docs and audit reports
├── .claude/                ← agents, skills, workflows and settings for Claude Code
├── docker-compose.yml      ← local infrastructure (Postgres 16)
└── CLAUDE.md               ← project instructions
```

**Production:** VPS with Docker managed by **Easypanel**. Each service (`web`, `lp`, `blog`) is built from its own Dockerfile. `web` runs `prisma migrate deploy` on container boot. `blog` no longer needs a volume: newsletter subscribers live in Resend Contacts (the old `/app/data` volume is only kept until the legacy JSON is imported, see `blog/CLAUDE.md`). See the `release` skill.

**Status (Oct 2026):** in production, no paying customers yet. Priorities: stabilize and secure → validate the full funnel → growth/marketing.

## Project Overview

AdvLink is a platform for Brazilian lawyers to create professional profile websites. Built with Next.js 16 (App Router, React 19), it includes authentication, multi-step onboarding, a sidebar-based dashboard for profile editing, dynamic public profile pages served via subdomains, an internal admin panel, analytics, and a support ticket system.

**Language/locale:** Brazilian Portuguese (pt-BR) throughout UI and content.

## Commands

All commands run from `web/`:

```bash
cd web
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (run once); test:watch / test:coverage / test:ui
npm run db:studio    # Open Prisma Studio GUI
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --create-only --name <name>   # schema change → versioned migration
```

Never use `npm run db:push` against a shared/production DB — schema changes go through migrations (see `db-migration` skill). Env vars are documented in `web/.env.example`. Local setup: `dev-env` skill.

Deploy build (`npm run build:deploy`) runs `prisma generate`, conditionally runs `prisma migrate deploy` in production, then `next build`. Output mode is `standalone`.

### Testing

Vitest + Testing Library (`web/vitest.config.ts`, jsdom by default, setup in `web/test/setup.ts`, shared mocks in `web/test/mocks/`). ~110 test files in `__tests__/` folders next to the code; every API route has one. API route tests start with `// @vitest-environment node` and declare mocks via `vi.hoisted()` before `vi.mock()`, importing the handler afterwards. Billing integration tests (`*.db.test.ts`) run against a real Postgres from `DATABASE_URL_TEST` in a sequential Vitest project and are skipped without it. CI (`.github/workflows/test.yml`) runs lint, typecheck and tests on push/PR to `main` (lint/typecheck are non-blocking until the existing debt is cleared).

## Architecture

### Routing & Middleware

- **App Router** with server components by default; client components marked `"use client"`
- **Proxy** (`web/proxy.ts` — Next 16's replacement for `middleware.ts`): gates `/`, `/onboarding`, and `/profile` behind auth; handles subdomain routing (`*.advlink.site` → `/adv/[subdomain]`, only for path `/`) and guards `/admin` with the admin JWT. `ROOT_DOMAIN` env var controls the domain (compared against the `host` header including port).
- **Key routes:**
  - `/` — Redirects to `/profile/edit` (protected)
  - `/login` — Auth (magic link, Google OAuth)
  - `/onboarding/profile` — Initial setup (protected)
  - `/profile/edit` — Dashboard editor with sidebar (protected)
  - `/profile/account` — Billing & account (protected)
  - `/profile/analytics` — Analytics dashboard (protected)
  - `/profile/tickets` — Support tickets (protected, list/new/detail)
  - `/admin/*` — Internal admin panel (separate JWT auth)
  - `/adv/[slug]` — Public lawyer profile (dynamic, public)
  - `/termos-e-privacidade` — Legal terms (public)

### Dashboard Layout

- **Light theme** with semantic Tailwind CSS variables (`bg-background`, `text-foreground`, `border-border`, etc.)
- **Sidebar** (`web/app/profile/AppSidebar.tsx`): Shadcn sidebar with collapsible icon mode on desktop, sheet fullscreen on mobile. Three groups:
  1. **Editor** — 10 tabs (estilo, perfil, endereço, áreas, equipe, galeria, links, seções extras, reordenar, SEO)
  2. **Dados** — Analytics link (`/profile/analytics`)
  3. **Ajuda** — Support tickets link (`/profile/tickets`)
- **Editor** uses client-side tab routing via `?tab=X` search params (estilo, perfil, endereco, areas, equipe, galeria, links, secoes-extras, reordenar, seo)
- **EditFormContext** (`web/app/profile/edit/EditFormContext.tsx`): Central provider with shared form state, mutations, custom sections, section config (order/labels/icons), avatar/cover cropping, and about markdown state
- **Section components** in `web/app/profile/edit/sections/` — one per tab (10 total)
- **SectionRenderer** reads `?tab` and renders the corresponding section; also exports `PublicSectionHeader` for inline title/icon editing
- **Preview** always visible on desktop (right column); on mobile, toggled via `MobilePreviewContext`/`MobilePreviewToggle` (Eye/Pencil button in header)
- **PublishedCTA** / **SubscribeCTA** — banners shown based on subscription status

### Admin Panel (`web/app/admin/`)

Separate internal admin app with its own JWT cookie auth (`admin-token`) via `jose`, independent of NextAuth.

- **Auth**: `web/lib/admin-auth.ts` — JWT sessions, `ADMIN_JWT_SECRET` env var
- **Layout**: `AdminProvider` + `AdminLayoutClient` + `AdminSidebar` (same Shadcn sidebar component)
- **Pages**: Dashboard, Users (list/detail), Sites (list/detail), Tickets (with messaging), Events, Financial, Admins management, Audit log
- **API**: `/api/admin/*` — Full REST API (auth, dashboard, users, sites, tickets, events, financial, funnel, admins, audit)
- **Audit**: `web/lib/audit-log.ts` writes `AuditLog` records for admin actions
- **Product Events**: `web/lib/product-events.ts` tracks events to `ProductEvent` model

### Auth (`web/auth.ts`)

NextAuth v4 with JWT strategy, Prisma adapter. Three providers: Email (magic links via nodemailer), Credentials (bcrypt), Google OAuth. Session callback injects `userId`.

### Multi-site (1 User : N Profiles)

A `User` can own several sites (`Profile`). The active one is resolved by `getActiveSiteId(userId)` in `web/lib/active-site.ts` (cookie, falling back to the first profile); the dashboard switches sites via `SiteSwitcher.tsx` / `SiteContext.tsx`, and new sites are created at `/onboarding/new-site` (`/api/sites`). **Every authenticated route must scope reads/writes by that `profileId`**, never by `userId` alone. Publication and billing are per site: `Profile.isActive` (published) is derived from `Profile.billingStatus` and `suspendedByAdmin` by `recomputeProfile` (`web/lib/billing/sync.ts`); Asaas payment links carry `externalReference = profileId`.

### Database (Prisma + PostgreSQL)

Schema in `web/prisma/schema.prisma`. Key models:

- **Core**: `User`, `Profile` (N per user) (public info, slug, theme, colors, SEO fields, `sectionOrder`/`sectionLabels`/`sectionIcons` JSON fields), `ActivityAreas`, `Links`, `Gallery`, `Address`, `CustomSection`, `TeamMember`
- **Analytics**: `PageView` (path, referrer, device, geo, visitorHash)
- **Admin**: `AdminUser` (email, role: admin/super_admin)
- **Support**: `Ticket` (auto-increment number, status, priority, category), `TicketMessage` (user/admin sender)
- **Tracking**: `ProductEvent` (type, userId, metaJson), `AuditLog` (action, entity, before/after snapshots)

Profile has a unique `slug` used for public URLs.

### Key Integrations

- **Asaas** (`web/lib/billing/`, account NAIR APPS): per-site monthly subscription via hosted recurring payment links (card + boleto, or Pix). `POST /api/billing/checkout`, `GET /api/billing/status`, `POST /api/billing/cancel`, webhook `POST /api/webhooks/asaas` (token header, fetch-on-notify, dedup in `WebhookEvent`), hourly `GET /api/cron/billing-sweep` (GitHub Actions) for grace (5 days) → suspension → churn (30 days). Local mirror: `BillingPaymentLink`, `BillingSubscription`, `BillingPayment`. Billing e-mails via Resend (`web/lib/emails/billingEmails.ts`). Sandbox testing: `asaas-sandbox` skill.
- **AWS S3** (`web/lib/s3.ts`): Avatar, cover, and gallery image uploads with cropping support (`react-easy-crop`).
- **OpenAI** (`web/lib/openai.ts`): Generates practice area descriptions using gpt-4o-mini, optimized for Brazilian legal context.
- **Resend** (`web/lib/resend.ts`): Transactional emails (auth, ticket notifications).
- **Tiptap**: Rich text editor for custom sections and area descriptions (`web/components/ui/rich-text-editor.tsx`).
- **Analytics**: Vercel Analytics/Speed Insights, Meta Pixel, per-user Google Tag Manager (`gtmContainerId` on Profile), custom `PageView` tracking with `geoip-lite` geo enrichment (`/api/analytics/track`).
- **dnd-kit**: Drag-and-drop for section reordering, gallery, areas, and links.

### UI & Styling

- **Tailwind CSS 4** with OKLCH color variables defined in `web/app/globals.css`
- **Light theme** by default — use semantic classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) instead of hardcoded zinc colors
- **Shadcn/ui** components (New York style, Radix UI based) in `web/components/ui/`
- **Four profile themes** in `web/components/themes/` — user-selectable via `Profile.theme` (NOT affected by dashboard theme):
  - Default → `Theme01`
  - `"modern"` → `Theme02`
  - `"classic"` → `Theme03`
  - `"corporate"` → `Theme04`

### State & Data Fetching

- **React Query** (`@tanstack/react-query`) for client-side server state
- **React Hook Form + Zod** for form validation
- Server components fetch data directly with Prisma; API routes handle mutations

### File Organization

- `web/app/profile/` — Dashboard layout with sidebar
  - `AppSidebar.tsx` — Sidebar navigation (3 groups: Editor, Dados, Ajuda)
  - `MobilePreviewContext.tsx` / `MobilePreviewToggle.tsx` — Mobile editor/preview toggle
  - `edit/` — Editor page
    - `EditDashboard.tsx` — Main layout (2-col desktop, mobile with preview toggle)
    - `EditFormContext.tsx` — Shared form state provider
    - `SectionRenderer.tsx` — Tab-to-component router + `PublicSectionHeader`
    - `types.ts` — Shared types and Zod schema
    - `api.ts` — API functions
    - `sections/` — 10 section components (Estilo, PerfilContato, Endereco, AreasServicos, Equipe, Galeria, Links, SecoesExtras, Reordenar, SEO)
    - `Preview.tsx`, `Preview02.tsx`, `Preview03.tsx`, `Preview04.tsx` — Live previews per theme
    - `PublishedCTA.tsx` / `SubscribeCTA.tsx` — Status banners
  - `analytics/` — Analytics dashboard (recharts)
  - `tickets/` — Support ticket system (list, new, detail)
  - `account/` — Billing page
- `web/app/admin/` — Internal admin panel (dashboard, users, sites, tickets, events, financial, admins, audit)
- `web/app/api/` — API routes (profile, links, gallery, activity-areas, onboarding, billing, webhooks, cron, admin, analytics, custom-sections, tickets)
- `web/components/ui/` — Shadcn UI components (including sidebar, rich-text-editor, icon-picker)
- `web/components/themes/` — Public profile themes (01, 02, 03, 04) — do NOT change these
- `web/components/analytics/` — `ProfileTracker` (page view beacon on public profiles)
- `web/lib/` — Utility modules (prisma, s3, billing, openai, resend, admin-auth, audit-log, product-events, curated-icons, icon-renderer, render-content, reserved-slugs, section-order, utils, emails)
- `web/prisma/` — Schema and migrations
- `web/assets/icons/` — SVG icons
- `web/hooks/` — Custom hooks (`use-mobile.ts`)

### Patterns

- **Slug generation**: Auto-generated from name with uniqueness suffix handling; reserved slugs blocked via `web/lib/reserved-slugs.ts`
- **Image uploads**: S3 with base64 encoding, cache-control headers; avatar/cover support cropping
- **Profile API** (`/api/profile/route.ts`): Main CRUD endpoint with upsert pattern for optional fields (address, etc.)
- **Activity areas**: Ordered by `position` field; AI description generation endpoint
- **Section ordering**: `sectionOrder`, `sectionLabels`, `sectionIcons` JSON fields on Profile; helpers in `web/lib/section-order.ts`; supports built-in keys + `custom_${id}` for custom sections
- **Custom sections**: CRUD via `/api/custom-sections`; rendered by themes alongside built-in sections
- **Rich text**: Tiptap editor with markdown conversion (`marked` + `turndown`); `renderContent()` in `web/lib/render-content.ts`
- **Admin auth**: Separate JWT flow via `jose`, cookie-based, independent from NextAuth
- **Path alias**: `@/*` maps to `web/` root (via tsconfig)

## Claude Code setup (`.claude/`)

**Agents** (`.claude/agents/`, delegate by domain):
| Agent | Use for |
|---|---|
| `backend-engineer` | API routes, Prisma/migrations, server logic, integrations |
| `frontend-engineer` | dashboard/onboarding/admin UI, components (not public themes) |
| `ux-analyst` | read-only usability analysis |
| `test-engineer` | Vitest tests, regression tests, broken tests |
| `email-engineer` | transactional/lifecycle emails (Resend) |
| `billing-specialist` | Asaas checkout/payment links, webhook, subscription lifecycle per site |
| `security-auditor` | read-only security review (auth, IDOR, XSS, uploads, secrets) |
| `seo-growth` | technical SEO for profiles, LP and blog; acquisition funnel |
| `legal-content-writer` | blog posts and marketing copy compliant with OAB Provimento 205/2021 |

**Skills** (`.claude/skills/`): `verify` (lint+typecheck+tests+build gate), `dev-env`, `db-migration`, `api-route`, `asaas-sandbox`, `prod-smoke`, `blog-post`, `release`.

**Workflows** (`.claude/workflows/`, multi-agent orchestration — run only when asked): `audit` (parallel read-only audit → verified report in `docs/`), `feature` (plan → implement → test → verify → review), `launch-readiness` (go-live checklist).
