# Porobook — Agent & Development Guidelines

This file is automatically loaded by Claude Code for every session in this repo. All agents (lead, teammates, subagents) must follow these rules.

## Project Spec Files

Read these before making any changes:

| File | Location | Purpose |
|------|----------|---------|
| Product Spec | `docs/product-spec.md` | V1 scope, features, guardrails — **authoritative** |
| Architecture | `docs/architecture.md` | System design, data model, invariants |
| UI Guidelines | `docs/ui-guidelines.md` | Colors, spacing, components, navigation rules |
| Feature Inventory | `FEATURES.md` | Everything already built — **do not break** |
| README | `README.md` | Tech stack, repo structure, API reference, setup |

## Monorepo Structure

```
nailbook/
├── apps/
│   ├── web/          # Next.js 15.5 — public booking + provider dashboard
│   ├── mobile/       # Expo 52 — provider + client native app
│   └── worker/       # BullMQ — background jobs
├── packages/
│   ├── db/           # Prisma 6 schema, client, migrations
│   ├── shared/       # Zod validators, TypeScript types, constants
│   └── config/       # Shared tsconfig + ESLint configs
```

## Tech Stack

- **Runtime**: Node 22, TypeScript 5.7
- **Monorepo**: pnpm 9.15 + Turborepo
- **Web**: Next.js 15.5, React 19, Tailwind CSS
- **Mobile**: Expo 52, React Native 0.76, React 18
- **Database**: PostgreSQL (Neon) + Prisma 6
- **Cache**: Upstash Redis (optional, graceful fallback)
- **Auth**: Clerk
- **Payments**: Stripe (API version `2025-02-24.acacia`)
- **Email**: Resend
- **SMS**: Twilio
- **Storage**: Cloudflare R2 (S3-compatible)

## Non-Negotiable Rules

### Architecture Invariants
1. **Multi-tenancy**: ALL queries scoped by `providerId`. No cross-provider data access.
2. **Event sourcing**: Every appointment status change creates an `AppointmentEvent`.
3. **Payment logging**: Every payment mutation creates a Payment record + AppointmentEvent.
4. **No hard deletes**: Appointments and payments are never deleted.
5. **Webhook idempotency**: Stripe webhooks check for duplicate events before processing.
6. **Lazy service init**: External clients (Stripe, Redis, S3, Resend, Twilio) use getter patterns. Never `new Client()` at module level — it breaks builds when env vars aren't set.

### Code Patterns
7. **All prices in cents**: Store as integers (`priceInCents: 2500`), display with `(cents / 100).toFixed(2)`.
8. **Timezone-aware**: Use `apps/web/src/lib/timezone.ts` utilities (`wallClockToUTC`, `dayBoundsUTC`, `formatForEmail`). Provider timezone from DB, defaults to `"America/New_York"`.
9. **API route exports**: Every route file needs `export const dynamic = "force-dynamic"`.
10. **API response envelope**: Success: `{ data: T }`. Error: `{ error: { message: string } }`.
11. **Rate limiting**: Public endpoints use `rateLimit(req)`, sensitive ones use `strictRateLimit(req)`.
12. **Cache invalidation**: Any mutation affecting availability must call invalidation from `apps/web/src/lib/cache.ts`.

### React / TypeScript
13. **Explicit return types**: Page and layout components need `(): React.JSX.Element` or `(): Promise<React.JSX.Element>` (React 18/19 monorepo type conflict workaround).
14. **Async layouts**: Use `children: any` for layout props to bypass dual React type conflict.
15. **tsconfig extends**: Use relative paths (`../../packages/config/tsconfig/next.json`), NOT workspace package paths.

### UI / Design
16. **Design tokens only**: Use Tailwind tokens from `tailwind.config.ts`. Never use raw gray classes (`bg-gray-100`). Use `bg-background`, `bg-surface`, `bg-border`, `text-text-primary`, etc.
17. **Status colors**: Import from `apps/web/src/lib/status-colors.ts`. Never define inline.
18. **Loading states**: Use `skeleton-shimmer` CSS class (gradient sweep animation) from `globals.css`. Never use `animate-pulse`. Never plain "Loading..." text.
19. **Empty states**: Dashed border for "no data yet", solid card for "no results for filter".
20. **8pt spacing grid**: Use `grid-1` (8px) through `grid-6` (48px) spacing tokens.
21. **Typography**: Use `font-display` (Playfair Display) for page headings, prices, KPI amounts, provider names, and the Porobook wordmark. Use `font-sans` (Inter) for body text, buttons, and UI labels.
22. **Card elevation**: Use border-based cards (`border border-border/50`) with `hover:shadow-soft hover:-translate-y-0.5` for interactive cards. Do not use heavy box shadows.
23. **Nav active state**: Use `border-b-2 border-primary` underline for active nav items. Do not use filled pill backgrounds. Use 6px dot indicators instead of number badges.

### What NOT To Do
- Do NOT add features outside the V1 scope defined in `../claude.md`
- Do NOT replace or rewrite existing working code without explicit instruction
- Do NOT use Supabase (intentionally deferred per architecture.md)
- Do NOT add analytics dashboards, loyalty/rewards, gift cards, subscriptions, or other out-of-scope features
- Do NOT use pure black backgrounds or neon colors
- Do NOT store dollar floats — cents only
- Do NOT create module-level service client instances

## Common Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps (web + mobile)
pnpm build            # Build all apps
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database (dev)
pnpm db:migrate       # Run migrations (prod)
pnpm db:studio        # Open Prisma Studio

# Type checking
cd apps/web && npx tsc --noEmit
cd packages/db && npx prisma validate
cd packages/shared && npx tsc --noEmit
```

## Existing Test Data

- Provider slug: `injusstice-nails`
- Provider ID: `cmlj2b38a0001yg2sedywn9g6`
- Clerk user: `justiceheughan16@gmail.com`
- 3 services, 3 appointments, 2 payments, Mon-Fri 9am-5pm availability
