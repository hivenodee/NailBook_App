# Porobook Deployment Checklist

Last updated: 2026-02-16

---

## Prerequisites

### Accounts Required

- [ ] Clerk — authentication (publishable + secret keys)
- [ ] Stripe — payments (secret key, publishable key, webhook secret)
- [ ] Neon or other PostgreSQL provider — database
- [ ] Vercel or similar — Next.js hosting
- [ ] Resend — transactional email (API key)
- [ ] Twilio — SMS notifications (SID, auth token, phone number)
- [ ] Cloudflare — R2 storage for portfolio media
- [ ] Upstash — Redis for caching + BullMQ job queues

### Optional (app works without these in degraded mode)

- Resend: Emails log to server console instead
- Twilio: SMS logs to server console instead
- Redis: Availability served uncached, background jobs disabled
- R2: Portfolio upload feature disabled

---

## Environment Variables

### Web App

```env
# Required
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email (optional — logs to console if unset)
RESEND_API_KEY=re_...
EMAIL_FROM=bookings@yourdomain.com

# SMS (optional — logs to console if unset)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Cache + Jobs (optional — uncached if unset)
REDIS_URL=https://...upstash.io
REDIS_TOKEN=...

# Media Storage (optional — uploads disabled if unset)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=porobook-media
R2_PUBLIC_URL=https://media.yourdomain.com
```

### Worker App

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=re_...
EMAIL_FROM=bookings@yourdomain.com
```

### Mobile App

```env
EXPO_PUBLIC_API_URL=https://yourdomain.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
```

---

## Database

- [ ] Provision PostgreSQL database
- [ ] Run `pnpm --filter @nailbook/db exec prisma migrate resolve --applied 0001_baseline` to mark baseline as applied on existing databases
- [ ] For new databases, run `pnpm --filter @nailbook/db exec prisma migrate deploy` to apply all migrations
- [ ] Verify all tables and enums created
- [ ] Future schema changes: use `pnpm db:migrate` (runs `prisma migrate dev`) locally, then `prisma migrate deploy` in CI/production

---

## Stripe Configuration

- [ ] Switch to live mode keys
- [ ] Register webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Enable events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] If using Stripe Connect for provider payouts, configure Connect settings

---

## Cloudflare R2

- [ ] Create bucket (e.g., `porobook-media`)
- [ ] Enable public access or connect custom domain
- [ ] Configure CORS policy:
  - Allowed Origins: `https://yourdomain.com`
  - Allowed Methods: GET, PUT
  - Allowed Headers: Content-Type
- [ ] Create API token with Object Read & Write permissions for the bucket

---

## Clerk

- [ ] Create production instance
- [ ] Configure allowed redirect URLs for your domain
- [ ] Set up social login providers if desired
- [ ] Copy publishable key and secret key

---

## Resend

- [ ] Create account and verify sender domain
- [ ] Copy API key
- [ ] Set `EMAIL_FROM` to verified sender address

---

## Twilio

- [ ] Create account and verify
- [ ] Purchase or verify phone number
- [ ] Copy Account SID, Auth Token, From Number

---

## Redis (Upstash)

- [ ] Create Redis database
- [ ] Copy REST URL and token
- [ ] Used for: availability caching (300s TTL), BullMQ job queues (reminders, follow-ups, exports, cleanup)

---

## Hosting

### Web App (Vercel recommended)

- [ ] Connect repository
- [ ] Set root directory to `apps/web`
- [ ] Set build command: `pnpm build`
- [ ] Set all environment variables listed above
- [ ] Verify `force-dynamic` on all API routes prevents static generation issues

### Worker App

- [ ] Deploy as long-running process (Docker, Railway, Fly.io, etc.)
- [ ] Dockerfile exists at `apps/worker/Dockerfile`
- [ ] Requires persistent Redis connection
- [ ] Runs 4 workers: reminders, follow-ups, exports, cleanup

---

## Post-Deploy Verification

- [ ] Home page loads at production URL
- [ ] Provider profile pages load (`/provider-slug`)
- [ ] Booking flow completes (select service, time, details, payment)
- [ ] Stripe checkout redirects and returns correctly
- [ ] Webhook fires and confirms appointment
- [ ] Confirmation page polls and shows success
- [ ] Dashboard loads and shows appointments
- [ ] Availability cache works (check Redis)
- [ ] Email sends (check Resend dashboard)
- [ ] SMS sends (check Twilio logs)
- [ ] Portfolio upload works (check R2 bucket)
- [ ] Background reminders scheduled (check Redis queues)

---

## Known Issues for V1

### ~~Documentation Drift~~ RESOLVED

~~The `.env.local.example` file references Postmark but the codebase uses Resend.~~
Both `.env.local.example` and `apps/worker/.env.example` now correctly reference Resend with all required variables documented.

### ~~No Automated Tests~~ RESOLVED (Minimal)

Minimal unit test suite added (48 tests, 4 files) covering core V1 logic:
- **Pricing** (`lib/pricing.test.ts`): add-on totals, coupon discounts (% and fixed), deposit calculation (NONE/FLAT/PERCENT), balance remaining/isPaid, overlap detection
- **Slot generation** (`lib/slots.test.ts`): 15/30-min increments, multi-rule days, booking conflict marking, timezone offset
- **Timezone** (`lib/timezone.test.ts`): wallClockToUTC (EST/EDT/JST), dayBoundsUTC boundaries, DST handling
- **Templates** (`lib/templates.test.ts`): variable substitution, missing vars, edge cases

Run locally: `pnpm test` or `pnpm --filter web test`
CI runs tests on every push to main and every PR.

### ~~No CI/CD Pipeline~~ RESOLVED

GitHub Actions CI pipeline configured at `.github/workflows/ci.yml`:
- Lint checks (`pnpm lint`)
- TypeScript type checking (`tsc --noEmit` on web + shared)
- Production build verification
- Migration directory safety check
- Runs on push to main and all PRs

### Mobile App Not Ready

Expo screens are stubbed but not functional. The mobile app is not part of V1 web launch but exists in the repo.

### ~~No Rate Limiting~~ RESOLVED

Rate limiting added via `@upstash/ratelimit` (graceful no-op when Redis not configured):
- **Strict** (10 req/min per IP): POST /api/appointments, POST /api/feedback, POST /api/appointments/:id/balance/checkout, POST /api/waitlist
- **Standard** (60 req/min per IP): POST /api/coupons/validate
- Implementation: `apps/web/src/lib/rate-limit.ts`

### ~~Database Migration Strategy~~ RESOLVED

Switched from `prisma db push` to `prisma migrate`:
- Baseline migration: `packages/db/prisma/migrations/0001_baseline/migration.sql`
- Dev workflow: `pnpm db:migrate` (runs `prisma migrate dev`)
- Production: `pnpm --filter @nailbook/db exec prisma migrate deploy`
- Package scripts: `migrate:deploy` and `migrate:resolve` added to `packages/db/package.json`

### Unused Postmark Dependency

`postmark` package (^4.0.0) remains in `apps/web/package.json` but is unused (code uses Resend). Safe to remove when convenient: `pnpm --filter web remove postmark`.
