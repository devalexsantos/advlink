# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo. The Next.js application lives in `web/`.

```
/
├── web/                    ← Next.js app (AdvLink)
├── docker-compose.yml      ← shared infrastructure (Postgres)
├── CLAUDE.md               ← project instructions
└── (future services)
```

## Project Overview

AdvLink is a platform for Brazilian lawyers to create professional profile websites. Built with Next.js 15 (App Router), it includes authentication, multi-step onboarding, a sidebar-based dashboard for profile editing, and dynamic public profile pages served via subdomains.

**Language/locale:** Brazilian Portuguese (pt-BR) throughout UI and content.

## Commands

All commands run from `web/`:

```bash
cd web
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to database
npm run db:studio    # Open Prisma Studio GUI
npx prisma generate  # Regenerate Prisma client after schema changes
```

Vercel build (`npm run build:vercel`) runs `prisma generate`, conditionally runs `prisma migrate deploy` in production, then `next build`.

No test framework is configured.

## Architecture

### Routing & Middleware

- **App Router** with server components by default; client components marked `"use client"`
- **Middleware** (`web/middleware.ts`): gates `/`, `/onboarding`, and `/profile` behind auth; handles subdomain routing (`*.advlink.site` → `/adv/[subdomain]`). `ROOT_DOMAIN` env var controls the domain.
- **Key routes:**
  - `/` — Redirects to `/profile/edit` (protected)
  - `/login` — Auth (magic link, Google OAuth)
  - `/onboarding/profile` — Initial setup (protected)
  - `/profile/edit` — Dashboard editor with sidebar (protected)
  - `/profile/account` — Billing & account (protected)
  - `/adv/[slug]` — Public lawyer profile (dynamic, public)

### Dashboard Layout

- **Light theme** with semantic Tailwind CSS variables (`bg-background`, `text-foreground`, `border-border`, etc.)
- **Sidebar** (`web/app/profile/AppSidebar.tsx`): Shadcn sidebar with collapsible icon mode on desktop, sheet fullscreen on mobile
- **Editor** uses client-side tab routing via `?tab=X` search params (estilo, perfil, endereco, areas, galeria, links, seo)
- **EditFormContext** (`web/app/profile/edit/EditFormContext.tsx`): Central provider with shared form state, mutations, and utilities
- **Section components** in `web/app/profile/edit/sections/` — one per tab
- **SectionRenderer** reads `?tab` and renders the corresponding section
- **Preview** always visible on desktop (right column), accessible via floating button on mobile

### Auth (`web/auth.ts`)

NextAuth v4 with JWT strategy, Prisma adapter. Three providers: Email (magic links via nodemailer), Credentials (bcrypt), Google OAuth. Session callback injects `userId`.

### Database (Prisma + PostgreSQL)

Schema in `web/prisma/schema.prisma`. Key models: `User`, `Profile` (public info, slug, theme, colors, SEO fields), `ActivityAreas`, `Links`, `Gallery`, `Address`. Profile has a unique `slug` used for public URLs.

### Key Integrations

- **Stripe** (`web/lib/stripe.ts`, `/api/stripe/webhook`): Subscription billing. `User.isActive` controls profile visibility. Webhook handles `checkout.session.completed`, subscription created/updated/deleted.
- **AWS S3** (`web/lib/s3.ts`): Avatar, cover, and gallery image uploads.
- **OpenAI** (`web/lib/openai.ts`): Generates practice area descriptions using gpt-4o-mini, optimized for Brazilian legal context.
- **Analytics**: Vercel Analytics/Speed Insights, Meta Pixel, per-user Google Tag Manager (`gtmContainerId` on Profile).

### UI & Styling

- **Tailwind CSS 4** with OKLCH color variables defined in `web/app/globals.css`
- **Light theme** by default — use semantic classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) instead of hardcoded zinc colors
- **Shadcn/ui** components (New York style, Radix UI based) in `web/components/ui/`
- **Three profile themes** in `web/components/themes/` — user-selectable via `Profile.theme` (NOT affected by dashboard theme)

### State & Data Fetching

- **React Query** (`@tanstack/react-query`) for client-side server state
- **React Hook Form + Zod** for form validation
- Server components fetch data directly with Prisma; API routes handle mutations

### File Organization

- `web/app/profile/` — Dashboard layout with sidebar
  - `AppSidebar.tsx` — Sidebar navigation
  - `edit/` — Editor page
    - `EditDashboard.tsx` — Main layout (2-col desktop, mobile with FABs)
    - `EditFormContext.tsx` — Shared form state provider
    - `SectionRenderer.tsx` — Tab-to-component router
    - `types.ts` — Shared types and Zod schema
    - `api.ts` — API functions
    - `sections/` — Individual section components
    - `Preview.tsx`, `Preview02.tsx`, `Preview03.tsx` — Live preview
  - `account/` — Billing page
- `web/app/api/` — API routes (profile, links, gallery, activity-areas, onboarding, stripe)
- `web/components/ui/` — Shadcn UI components (including sidebar)
- `web/components/themes/` — Public profile themes (01, 02, 03) — do NOT change these
- `web/lib/` — Utility modules (prisma, s3, stripe, openai, utils, emails)
- `web/prisma/` — Schema and migrations
- `web/assets/icons/` — SVG icons

### Patterns

- **Slug generation**: Auto-generated from name with uniqueness suffix handling
- **Image uploads**: S3 with base64 encoding, cache-control headers
- **Profile API** (`/api/profile/route.ts`): Main CRUD endpoint with upsert pattern for optional fields (address, etc.)
- **Activity areas**: Ordered by `position` field; AI description generation endpoint
- **Path alias**: `@/*` maps to `web/` root (via tsconfig)
