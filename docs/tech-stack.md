# Porobook — Tech Stack & Services Reference

## Monorepo Structure

```
nailbook/
├── apps/
│   ├── web/          # Next.js 15.5 — public booking + provider dashboard
│   ├── mobile/       # Expo 52 — provider + client native app
│   └── worker/       # BullMQ — background jobs (reminders, exports, cleanup)
├── packages/
│   ├── db/           # Prisma 6 schema, client, migrations
│   ├── shared/       # Zod validators, TypeScript types, constants
│   └── config/       # Shared tsconfig + ESLint configs
```

**Tooling:** pnpm 9.15, Turborepo, TypeScript 5.7, Node 22

---

## Core Frameworks

| Framework | Version | Where | Purpose |
|-----------|---------|-------|---------|
| Next.js | 15.5 | `apps/web` | Web app (SSR, API routes, middleware) |
| React | 19.0 | `apps/web` | Web UI |
| React | 18.3 | `apps/mobile` | Mobile UI (Expo requires 18) |
| React Native | 0.76 | `apps/mobile` | Cross-platform native |
| Expo | 52.0 | `apps/mobile` | Mobile toolchain, OTA updates, push |
| Expo Router | 4.0 | `apps/mobile` | File-based mobile routing |
| Tailwind CSS | 3.4 | `apps/web` | Styling (design tokens, custom theme) |
| Prisma | 6.19 | `packages/db` | ORM, migrations, schema |
| BullMQ | 5.30 | `apps/worker` | Job queues (reminders, exports, cleanup) |
| Zod | 3.24 | `packages/shared` | Runtime schema validation |

---

## External Services & APIs

### 1. Stripe — Payments
- **Version:** stripe@17.5.0
- **API Version:** `2025-02-24.acacia`
- **Purpose:** Deposits, full payments, balance collection, tips, refunds, payouts
- **Client:** `apps/web/src/lib/stripe.ts` (lazy init via Proxy)
- **Webhook:** `apps/web/src/app/api/webhooks/stripe/route.ts`
  - `checkout.session.completed` — payment success
  - `checkout.session.expired` — timeout
  - `charge.refunded` — refund processing
- **Mobile SDK:** `@stripe/stripe-react-native@0.39.0`
- **Env vars:**
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`

### 2. Clerk — Authentication
- **Version:** @clerk/nextjs@6.9.0, @clerk/clerk-expo@2.4.0
- **Purpose:** User registration, login, sessions, protected routes
- **Client:** `apps/web/src/middleware.ts`, `apps/web/src/app/layout.tsx`
- **Mobile:** `apps/mobile/src/app/_layout.tsx`
- **DB link:** `User.clerkId` (unique) in Prisma schema
- **Env vars:**
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 3. Neon — Database (PostgreSQL)
- **ORM:** Prisma 6.19 (`packages/db/prisma/schema.prisma`)
- **Models:** 28 (User, Provider, Appointment, Payment, Service, Feedback, MediaAsset, etc.)
- **Multi-tenancy:** All queries scoped by `providerId`
- **Event sourcing:** `AppointmentEvent` for every status change
- **Env vars:**
  - `DATABASE_URL`

### 4. Resend — Transactional Email
- **Version:** resend@6.9.2
- **Purpose:** Booking confirmations, cancellations, reminders, follow-ups, balance requests, completion thank-yous
- **Client:** `apps/web/src/lib/email.ts` (lazy init, falls back to console.log)
- **Functions:** `sendClientConfirmation()`, `sendProviderNewBooking()`, `sendCancellationEmail()`, `sendCompletionThankYou()`, `sendWaitlistAvailableEmail()`, `sendBalanceRequest()`
- **Templates:** Customizable per provider via `MessageTemplate` model
- **Env vars:**
  - `RESEND_API_KEY`
  - `EMAIL_FROM`

### 5. Twilio — SMS
- **Version:** twilio@5.12.1
- **Purpose:** Booking confirmations, reminders, cancellations, balance/tip requests
- **Client:** `apps/web/src/lib/sms.ts` (lazy init, falls back to console.log)
- **Functions:** `sendBookingConfirmationSms()`, `sendAppointmentReminderSms()`, `sendCancellationSms()`, `sendWaitlistAvailableSms()`, `sendBalanceRequestSms()`, `sendCompletionSms()`
- **Env vars:**
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`

### 6. Upstash Redis — Cache & Rate Limiting
- **Version:** @upstash/redis@1.34.0, @upstash/ratelimit@2.0.8
- **Purpose:** Availability caching (5-min TTL), rate limiting, BullMQ queue backend
- **Clients:**
  - `apps/web/src/lib/redis.ts` — Upstash REST client
  - `apps/web/src/lib/rate-limit.ts` — 60 req/min standard, 10 req/min strict
  - `apps/web/src/lib/cache.ts` — Availability slot caching with invalidation
  - `apps/worker/src/queue.ts` — IORedis for BullMQ (ioredis@5.4.0)
- **Graceful fallback:** No-ops when env vars missing
- **Env vars:**
  - `REDIS_URL`
  - `REDIS_TOKEN`

### 7. Cloudflare R2 — Object Storage
- **SDK:** @aws-sdk/client-s3@3.700.0, @aws-sdk/s3-request-presigner@3.700.0
- **Purpose:** Portfolio media (photos/videos), CSV export files
- **Client:** `apps/web/src/lib/storage.ts`
- **Functions:** `getUploadUrl()` (10-min signed PUT), `getDownloadUrl()` (1-hr signed GET), `getPublicUrl()`
- **Env vars:**
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

### 8. Expo Push — Mobile Notifications
- **Version:** expo-server-sdk@5.0.0
- **Purpose:** Push notifications to iOS/Android (reminders, booking alerts)
- **Client:** `apps/web/src/lib/push.ts` (lazy init)
- **Token registration:** `apps/web/src/app/api/push-tokens/route.ts`
- **Mobile side:** `apps/mobile/src/app/_layout.tsx` (PushTokenRegistration)
- **Worker jobs:** `apps/worker/src/jobs/reminders.ts`, `push-receipts.ts`, `notification-retry.ts`
- **Env vars:**
  - `EXPO_ACCESS_TOKEN` (optional)

### 9. Sentry — Error Tracking
- **Version:** @sentry/nextjs@10.39.0
- **Purpose:** Server + client error monitoring, performance tracing (10% sample rate)
- **Config files:**
  - `apps/web/sentry.client.config.ts`
  - `apps/web/sentry.server.config.ts`
  - `apps/web/sentry.edge.config.ts`
- **Env vars:**
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`

---

## UI Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| lucide-react | 0.575 | Icons |
| react-hook-form | 7.54 | Form state (web + mobile) |
| @hookform/resolvers | 3.9 | Zod form validation |
| recharts | 3.7 | Charts (dashboard analytics) |
| react-easy-crop | 5.5 | Image cropping |
| leaflet + react-leaflet | 1.9 / 5.0 | Maps (provider location) |
| class-variance-authority | 0.7 | Component variants |
| clsx | 2.1 | Conditional classnames |
| isomorphic-dompurify | 3.0 | XSS prevention |

---

## Worker Job Queues

| Queue | Schedule | Purpose |
|-------|----------|---------|
| `reminderQueue` | Per appointment | 24h + 2h reminders (email, SMS, push) |
| `followupQueue` | Per appointment | Post-appointment thank you + rebooking |
| `exportQueue` | On demand | CSV generation + R2 upload |
| `cleanupQueue` | Every 15 min | Expired session/data cleanup |
| `pushReceiptQueue` | Every 5 min | Check Expo push delivery status |
| `notificationRetryQueue` | Every 15 min | Retry failed push notifications |

---

## Graceful Degradation

These services fall back silently when not configured:

| Service | Fallback |
|---------|----------|
| Resend (email) | Logs to console |
| Twilio (SMS) | Logs to console |
| Upstash Redis | Rate limiting + cache skip |
| Expo Push | Logs to console |
| Sentry | Disabled |
| R2 Storage | Portfolio uploads won't work (no fallback) |

All external clients use **lazy initialization** (getter pattern) — never `new Client()` at module level. This prevents build failures when env vars aren't set.

---

## Environment Variables (Complete)

```bash
# Database (required)
DATABASE_URL=

# Auth (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Payments (required)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Cache & Jobs (recommended)
REDIS_URL=
REDIS_TOKEN=

# Email (optional, logs to console if missing)
RESEND_API_KEY=
EMAIL_FROM=

# SMS (optional, logs to console if missing)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Storage (required for media uploads)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=

# Mobile
EXPO_PUBLIC_API_URL=
EXPO_ACCESS_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```
