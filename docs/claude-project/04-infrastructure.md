# PoroBook — Infrastructure & Setup

Use this when asking Claude about deploys, debugging, env vars, dev-server issues, or architectural questions.

---

## Tech stack at a glance

| Layer | Choice | Version |
|---|---|---|
| **Runtime** | Node.js | 22 |
| **Language** | TypeScript | 5.7 |
| **Monorepo** | pnpm + Turborepo | pnpm 9.15 |
| **Web framework** | Next.js (App Router) | 15.5 |
| **UI** | React + Tailwind CSS | React 19, Tailwind 3 |
| **ORM** | Prisma | 6.19 |
| **Database** | PostgreSQL via Neon (serverless) | — |
| **Cache / queue** | Redis (local dev) + Upstash Redis (prod) | — |
| **Auth** | Clerk | — |
| **Payments** | Stripe (API version `2025-02-24.acacia`) | — |
| **Email** | Resend | — |
| **SMS** | Twilio | — |
| **Object storage** | Cloudflare R2 (S3-compatible) | — |
| **Error monitoring** | Sentry (`@sentry/nextjs`) | — |
| **Mobile (deferred)** | Expo + React Native | Expo 52, RN 0.76 |
| **Background jobs** | BullMQ | — |
| **Image animation** | Framer Motion | 12 |
| **Maps** | Leaflet + OpenStreetMap tiles | — |
| **Charts** | Recharts | — |
| **Image cropping** | react-easy-crop | — |
| **Validators** | Zod | — |

---

## Monorepo structure

```
nailbook/
├── apps/
│   ├── web/          # Next.js 15.5 — public booking + provider dashboard
│   │   ├── src/
│   │   │   ├── app/             # App Router pages + API routes
│   │   │   ├── components/      # UI components (ui/ for primitives, layout/ for nav)
│   │   │   ├── lib/             # design-tokens, email, sms, storage, timezone, cn, etc.
│   │   │   ├── styles/          # globals.css
│   │   │   └── middleware.ts    # Clerk auth gate
│   │   ├── public/brand/        # 12 editorial JPEGs + MANIFEST.md
│   │   ├── next.config.js       # CSP, image remotePatterns, Sentry wrap
│   │   └── tailwind.config.ts   # reads from lib/design-tokens.ts
│   ├── mobile/       # Expo 52 (deferred for V1)
│   └── worker/       # BullMQ background jobs
├── packages/
│   ├── db/           # Prisma schema + client + migrations
│   ├── shared/       # Zod validators, shared types, constants (MEDIA_LIMITS, etc.)
│   └── config/       # Shared tsconfig + ESLint
└── docs/
    ├── claude-project/    # ← THIS FOLDER (Claude Project context)
    ├── launch-playbook.md # phases A–H to first paying beta provider
    ├── architecture.md
    ├── product-spec.md
    ├── ui-guidelines.md
    └── ...
```

---

## Current state (local dev)

These services run locally during development:

| Service | How to start | Port | Status check |
|---|---|---|---|
| **Next.js web** | `pnpm dev --hostname 0.0.0.0` from `apps/web/` | 3000 | `curl http://localhost:3000` |
| **BullMQ worker** | `pnpm dev` from `apps/worker/` | — | `pgrep -f tsx.*worker` |
| **Local Redis** | `redis-server` (homebrew) | 6379 | `redis-cli ping` |
| **Prisma Studio** | `pnpm prisma studio` from `packages/db/` | 5555 | `curl http://localhost:5555` |
| **Stripe CLI webhook forwarder** | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` | — | `pgrep -f "stripe listen"` |

### Phone testing (same Wi-Fi)
Web is bound to 0.0.0.0 — reachable from any device on the LAN at `http://10.0.0.70:3000` (replace IP). Mac firewall may block inbound; toggle off in System Settings → Network → Firewall for testing.

### Known dev issues
- **Neon idle disconnect** kills the worker after extended idle time. Symptom: "Server has closed the connection" in worker logs. Workaround: `cd apps/worker && pnpm dev` to restart. Real fix is Prisma connection retry/keepalive (deferred).
- **First-hit compile is slow** in Next.js dev mode (1–4s per route). This is expected; production build is fast (Lighthouse Perf 96).
- **Stripe CLI session can expire** — error reads `Expired API Key ...FccV3e`. Fix: `stripe config --set test_mode_api_key sk_test_…` with the current key from `.env.local` (sidesteps the browser-based `stripe login` flow).

---

## Environment variables

All in `apps/web/.env.local` (gitignored). The `.env.local.example` in the repo lists every required key.

### Critical for V1 production

| Variable | Purpose | Current state |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection | ✅ set |
| `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth | ✅ set (dev tenant) |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | ✅ set (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature validation | ✅ set (from Stripe CLI) |
| `RESEND_API_KEY` | Email | ✅ set |
| `RESEND_FROM_EMAIL` | Sender address | ✅ set (currently dev default) |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | SMS | ✅ set (trial number) |
| `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET_NAME` + `R2_ACCOUNT_ID` + `R2_PUBLIC_URL` | Cloudflare R2 storage | ✅ set (dev bucket `nailbook-media`) |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` | Error monitoring | ✅ set |
| `NEXT_PUBLIC_APP_URL` | Self-reference for absolute URLs | ✅ set (`http://localhost:3000`) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Production cache + rate limit | ❌ **missing — needed for prod** |
| `EXPO_ACCESS_TOKEN` | Push notifications (mobile, deferred) | optional |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push (deferred) | optional |

### Local-only

| Variable | Purpose |
|---|---|
| `REDIS_URL=redis://localhost:6379` | Worker queue connection (web uses Upstash if set, otherwise falls back to local) |

---

## Production deployment plan (Phase D in launch playbook)

Not yet executed. Plan:

### Web (Next.js)
- **Vercel** (recommended) — connects to GitHub repo, auto-deploy on `main` push
- Root directory: `apps/web/`
- Build command: `pnpm build`
- Output: handled by Next.js + Vercel adapter
- Environment variables: paste all from `.env.local`, swapping test → live where applicable (Stripe, Clerk)

### Worker (BullMQ)
- Cannot run on Vercel (long-running process). Options in order of recommendation:
  - **Railway** ($5–20/mo, easiest, `railway up` from `apps/worker/`)
  - **Render** (similar)
  - **Fly.io** (cheaper at scale, more setup)
- Needs same env vars as web for DB + Resend + Twilio access
- Needs `REDIS_URL` pointing at Upstash (or whatever production Redis you provision)

### Database
- Already on Neon. Just point production env at the same database OR provision a separate "production" branch in Neon (recommended once you're past initial launch).

### Object storage
- Currently `nailbook-media` bucket on Cloudflare R2. For production, create a separate `porobook-prod-media` bucket. Add the production domain to CORS policy when ready.

### Domain + DNS
- Buy `porobook.com` (Phase 0). Point at Vercel.
- Add Cloudflare in front for DDoS / WAF (free tier). Vercel's edge is good but Cloudflare adds rate limiting and Bot management.

### CDN
- Vercel includes edge caching out of the box. No separate CDN needed for V1.

### Email sending domain
- Currently sending from a Resend dev default. For production:
  1. Add `porobook.com` to Resend dashboard
  2. Set SPF, DKIM, DMARC DNS records (Resend provides them)
  3. Wait for verification (~hours)
  4. Update `RESEND_FROM_EMAIL=bookings@porobook.com`

### SMS sender
- Twilio trial number can only message verified phones. For production:
  1. Buy a real Twilio US number (~$1/mo + per-message cost)
  2. Update `TWILIO_FROM_NUMBER`
  3. Optionally register for A2P 10DLC (carrier-required for higher throughput)

### Sentry
- Already configured. Production deploy just inherits the existing DSN — no extra setup.

### Clerk
- Currently using dev tenant. For production:
  1. In Clerk dashboard, switch project to production mode (one-time, ~10 min)
  2. Requires production domain (chicken-and-egg with DNS — do this AFTER you have porobook.com)
  3. Update `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the new prod values

### Stripe
- Currently test mode. Live mode requires:
  1. Business entity (LLC) + EIN (Phase F1/F2)
  2. Bank account for payouts
  3. Stripe identity verification
  4. Submit application — 1–3 business days approval
  5. New `sk_live_…` + `pk_live_…` keys
  6. New webhook endpoint at production URL — new `whsec_…`

---

## Key architecture invariants

These hold true across the codebase. Don't break them without explicit user direction.

1. **Multi-tenancy by `providerId`.** Every query that touches provider data is scoped by `providerId`. No cross-provider data access via any API.
2. **Event sourcing for appointments.** Every status change creates an `AppointmentEvent` row. Appointments are append-only (status changes, no hard deletes).
3. **Payment logging.** Every payment mutation creates a `Payment` row + an `AppointmentEvent`. Audit trail is complete.
4. **Webhook idempotency.** Stripe webhooks check for duplicate `event.id` before processing. Re-delivery is safe.
5. **Lazy service initialization.** Service clients (Stripe, Redis, S3, Resend, Twilio) use getter patterns — `new Client()` at module top breaks builds when env vars aren't set at build time.
6. **All prices in cents.** Stored as integers. Displayed via `(cents / 100).toFixed(2)`. Never floats.
7. **Timezone-aware.** Use `apps/web/src/lib/timezone.ts` utilities. Provider `timezone` from DB defaults to `"America/New_York"`. Display formatters take a `tz` parameter; comparison helpers (like `isToday`) compare in provider's tz, not browser-local.
8. **API route signatures.** Every route exports `export const dynamic = "force-dynamic"` and uses the success/error envelope: `{ data: T }` or `{ error: { message: string } }`.
9. **Rate limiting.** `rateLimit(request)` for public endpoints, `strictRateLimit(request)` for sensitive ones. Both no-op when Redis is unavailable (with a console warning).
10. **No hard deletes.** Appointments, payments, providers, feedback, messages — none are ever DELETE'd from the DB. Status changes only.

---

## Content Security Policy (CSP)

Configured in `apps/web/next.config.js`. Permissions:

| Directive | What's allowed | Why |
|---|---|---|
| `default-src` | `'self'` | Default-deny everything else |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com *.clerk.accounts.dev *.accounts.dev clerk.nailbook.com` | Stripe + Clerk JS |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind inlines styles |
| `font-src` | `'self'` | Self-hosted via `next/font` |
| `img-src` | `'self' data: blob: *.r2.dev *.r2.cloudflarestorage.com img.clerk.com *.tile.openstreetmap.org` | R2 storage, Clerk avatars, Leaflet map tiles |
| `connect-src` | `'self' api.stripe.com *.clerk.accounts.dev *.accounts.dev *.upstash.io *.sentry.io *.r2.cloudflarestorage.com *.r2.dev` | Service APIs + R2 uploads (PUT) |
| `frame-src` | `js.stripe.com *.clerk.accounts.dev *.accounts.dev` | Stripe Checkout iframe, Clerk modals |
| `worker-src` | `'self' blob:` | Service workers |
| `object-src` | `'none'` | Block legacy plugins |
| `base-uri` | `'self'` | Prevent base-href injection |

### Gotchas
- **R2 uploads need both** `img-src` (for reading the URL back) and `connect-src` (for the PUT fetch). Missing the latter caused a "Failed to fetch" bug recently — now fixed.
- **Clerk dev mode** uses raw `*.accounts.dev` subdomains (e.g. `winning-moray-85.accounts.dev`), not `*.clerk.accounts.dev`. Production uses `clerk.nailbook.com` (the eventual custom Clerk domain).
- **Sentry regional ingest** is at `*.ingest.us.sentry.io`. We allow `*.sentry.io` to cover all regions.

When adding a new third-party service, the directive is usually `connect-src` (for XHR/fetch) and `img-src` (if it serves images).

---

## Caching strategy

### Availability cache
- Per-provider-per-date slot calculation is cached in Redis for **5 minutes**.
- Cache key: `availability:{providerId}:{YYYY-MM-DD}`
- Invalidated on every mutation that affects availability:
  - Appointment created / cancelled / rescheduled
  - Availability rule changed
  - Time-off created / deleted
  - Provider `booksOpen` / `booksOpenAt` / `bookingWindowDays` / `bufferMinutes` changed
- Helpers in `apps/web/src/lib/cache.ts`: `getAvailabilityCache`, `setAvailabilityCache`, `invalidateAvailability`, `invalidateAvailabilityRange`, `invalidateAllAvailability`

### No-op fallback
- All cache helpers no-op when Redis isn't configured. The endpoints recompute slots on every request in that case. Acceptable for solo dev; not acceptable for production (will tank performance under load).

---

## Performance budget

Production targets (verified via Lighthouse on the deployed build):

| Metric | Target | Current (last measured 2026-04) |
|---|---|---|
| Performance | ≥90 | 96 |
| Accessibility | ≥95 | 96 |
| Best Practices | ≥85 | 73 (capped at 73 in dev because of Clerk dev-tenant 3rd-party cookies — will rise in prod) |
| SEO | 100 | 100 |
| LCP | <2.5s | 1.4s |
| CLS | <0.1 | 0 |
| TBT | <300ms | 0 |

Re-run after any major redesign or new dependency.

---

## Backup + DR plan (lightweight)

- **Database backups**: Neon auto-snapshots, 7-day retention on Free, 30-day on Pro
- **R2 storage**: no automatic versioning enabled (defer until 10+ providers)
- **GitHub repo**: source of truth for code
- **Secrets**: in your password manager. `.env.local` is gitignored.

For beta, this is sufficient. Past 100 providers, consider:
- Manual weekly DB export to S3 / R2
- Bucket versioning on R2 (Cloudflare supports it, small cost)
- Sentry alerts on webhook failures (currently logged only)
