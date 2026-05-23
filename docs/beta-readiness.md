# Porobook Beta Readiness & Production Prep Audit

**Audit Date**: 2026-02-22
**Scope**: Full monorepo — `apps/web`, `apps/worker`, `apps/mobile`, `packages/*`
**Auditor**: Automated codebase analysis (3 parallel agents + manual review)

---

## A. Executive Summary

Porobook has a **solid V1 feature set** — 22 Prisma models, 41+ REST endpoints, Stripe payments, email/SMS notifications, and a provider dashboard. The codebase follows good patterns: lazy service initialization, event sourcing for appointments, provider-scoped multi-tenancy, and webhook idempotency.

**However, 6 critical issues must be fixed before beta:**

1. Rate limiting is **completely disabled** without Redis (no protection on any endpoint)
2. No appointment **status transition validation** (CANCELLED appointments can be re-confirmed)
3. No **error monitoring** (Sentry not integrated — zero visibility into production errors)
4. No **privacy policy or terms of service** pages (legally required for Stripe)
5. Missing rate limit on **tip checkout** endpoint
6. Architecture doc drift (says Postmark, code uses Resend)

**Overall Risk Level**: **MEDIUM-HIGH** — functional product with gaps in abuse protection and observability.

---

## B. P0 — Must Fix Before Beta

### B1. Rate Limiting Disabled Without Redis
**Severity**: CRITICAL
**File**: `apps/web/src/lib/rate-limit.ts`

Both `rateLimit()` and `strictRateLimit()` return `null` when `REDIS_URL` is not set. This means **every public endpoint is unprotected** in any deployment without Redis:
- Booking creation (`POST /api/appointments`)
- Feedback submission (`POST /api/feedback`)
- Waitlist signup (`POST /api/waitlist`)
- Coupon validation (`POST /api/coupons/validate`)

**Fix**: Either require Redis for production deployments, or implement an in-memory fallback rate limiter (e.g., Map-based with sliding window) for single-instance deployments.

---

### B2. No Appointment Status Transition Validation
**Severity**: HIGH
**File**: `apps/web/src/app/api/appointments/[id]/route.ts` (lines 105-129)

The PATCH handler validates WHO can perform actions but not WHETHER the transition is valid from the current status:
- A **CANCELLED** appointment can be re-confirmed if the "accept" action is called
- A **COMPLETED** appointment can be set back to CONFIRMED
- Stripe webhook (`checkout.session.completed`) can confirm an already-COMPLETED appointment

**Fix**: Add a status guard at the top of the switch block:
```
Valid transitions:
  PENDING_PAYMENT → CONFIRMED (accept/webhook)
  CONFIRMED → COMPLETED | CANCELLED | NO_SHOW
  PENDING_PAYMENT → CANCELLED
```

---

### B3. No Error Monitoring (Sentry)
**Severity**: HIGH
**Files**: None — Sentry SDK is not installed or configured

`architecture.md` lists Sentry as required. Environment variables (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) exist in `.env.local.example` but are empty and unused. No Sentry imports exist anywhere in the web or worker apps.

**Impact**: Zero visibility into production errors. API 500s, webhook failures, and client-side crashes will be silent.

**Fix**: Install `@sentry/nextjs`, configure error boundary + server instrumentation. Add `@sentry/node` to worker app.

---

### B4. No Privacy Policy or Terms of Service
**Severity**: HIGH
**Files**: None exist

Stripe requires merchants to have a privacy policy and terms of service. No `/privacy` or `/terms` pages exist. No links to legal pages anywhere in the app.

**Fix**: Create `/privacy` and `/terms` pages. Add footer links to public pages and booking flow.

---

### B5. Missing Rate Limit on Tip Checkout
**Severity**: MEDIUM
**File**: `apps/web/src/app/api/appointments/[id]/tip/checkout/route.ts`

This public endpoint creates Stripe Checkout sessions but has no rate limiting. An attacker could spam thousands of Stripe sessions, causing noise and potential costs.

**Fix**: Add `strictRateLimit(request)` check at the top of the POST handler.

---

### B6. Architecture Doc Drift
**Severity**: MEDIUM
**Files**: `docs/architecture.md`, `CLAUDE.md`

- Architecture doc says email provider is **Postmark** — code actually uses **Resend**
- Architecture doc lists Sentry as integrated — it is not
- `CLAUDE.md` correctly reflects the actual stack

**Fix**: Update `docs/architecture.md` to match reality. Single source of truth prevents confusion.

---

## C. P1 — Should Fix Before Public Launch

### C1. Recurring Cancellation Not Atomic
**Severity**: MEDIUM
**File**: `apps/web/src/app/api/appointments/[id]/route.ts` (lines 162-186)

When cancelling "all future" recurring appointments, each one is updated in a separate transaction inside a loop. If the process crashes mid-loop, some appointments are cancelled and others aren't.

**Fix**: Wrap the entire loop in a single `prisma.$transaction()`.

---

### C2. TIP Payment Race Condition
**Severity**: MEDIUM
**File**: `apps/web/src/app/api/appointments/[id]/tip/checkout/route.ts`

The "already tipped" check uses `findFirst` — no database-level constraint prevents two concurrent tip submissions from both succeeding.

**Fix**: Add a compound unique constraint `@@unique([appointmentId, type])` where type = TIP, or use a unique index on `(appointmentId, type, status)`.

---

### C3. Missing Cache Invalidation on Provider Profile Changes
**Severity**: MEDIUM
**File**: `apps/web/src/app/api/providers/me/route.ts`

When a provider changes `booksOpen`, `booksOpenAt`, or `bookingWindowDays`, the availability cache is NOT invalidated. Clients may see stale slot availability until the 5-minute TTL expires.

**Fix**: Call `invalidateAllAvailability(provider.id)` when booking-related fields change.

---

### C4. Undocumented Environment Variables
**Severity**: LOW
**Files**: `.env.local.example`, `apps/worker/.env.example`

| Variable | Used In | Missing From |
|----------|---------|-------------|
| `EXPO_ACCESS_TOKEN` | push.ts, 3 worker jobs | Both .env examples |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | usePushRegistration.ts | web .env example |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER` | 2 worker jobs | worker .env example |

**Fix**: Add missing variables to the appropriate `.env.example` files.

---

### C5. No File Size Validation for Avatar Uploads
**Severity**: LOW
**File**: `apps/web/src/app/api/providers/me/avatar/route.ts`

Content-type is validated (images only) but file size is not validated before generating the presigned upload URL. A user could upload an arbitrarily large file.

**Fix**: Add `Content-Length` validation or set a max size on the presigned URL.

---

### C6. 11 Dependency Vulnerabilities
**Severity**: LOW (all transitive)

```
1 critical  — fast-xml-parser (via @aws-sdk, not directly exploitable)
8 high      — tar, bn.js, ajv (via expo, build tools)
2 moderate  — various
```

None are directly exploitable in Porobook's usage patterns. All are in transitive dependencies from Expo and AWS SDK.

**Fix**: Run `pnpm audit fix` where possible. Monitor for upstream patches. Consider `pnpm.overrides` for critical ones.

---

### C7. manageToken Included in Confirmation Emails
**Severity**: LOW-MEDIUM
**File**: `apps/web/src/app/api/webhooks/stripe/route.ts` (line ~170)

The appointment `manageToken` (used for unauthenticated self-service cancel/reschedule) is included in booking confirmation email data. This is by design for the self-manage feature, but means:
- Anyone who intercepts/forwards the email can cancel/reschedule
- Token is visible in email provider systems and logs

**Note**: This is the intended design (Feature 2: Client Self-Manage). The risk is acceptable for beta but consider short-lived tokens for production.

---

## D. P2 — Can Defer to Post-Launch

### D1. Email/SMS Failures Are Silent
**Files**: Multiple route files

Email and SMS sending failures are caught and logged but never propagated to the client. The API returns success even if the confirmation email fails to send. This is the correct pattern (don't fail the booking because email is down), but consider adding a retry queue or flagging for manual review.

---

### D2. Guest User Creation Not Atomic
**File**: `apps/web/src/app/api/appointments/route.ts`

Guest user `upsert` happens outside the appointment creation transaction. If the process crashes between user creation and appointment creation, an orphaned user record exists. Low impact — the user can simply rebook.

---

### D3. Structured Logging
**Files**: All

The app uses `console.log`/`console.error` throughout. No structured JSON logging, no correlation IDs, no log levels. This makes production debugging harder.

**Fix**: Add a logging utility (e.g., `pino`) with JSON output, request correlation IDs, and configurable log levels.

---

### D4. No Health Check Endpoint
**Files**: None

No `/api/health` endpoint exists for load balancer health checks or monitoring.

**Fix**: Add `GET /api/health` that returns `{ status: "ok", timestamp, version }` and optionally checks DB + Redis connectivity.

---

### D5. CI Doesn't Run Worker Type Checks
**File**: `.github/workflows/ci.yml`

CI runs type checks for `web` and `shared` but not for `worker` or `mobile`.

**Fix**: Add `pnpm --filter worker exec tsc --noEmit` to CI.

---

## E. Environment & Services Summary

### Required for Beta

| Service | Provider | Required | Graceful Fallback |
|---------|----------|----------|-------------------|
| PostgreSQL | Neon | YES | No |
| Clerk Auth | Clerk | YES | No |
| Stripe Payments | Stripe | YES | No |
| Redis | Upstash | **YES*** | Yes (but disables rate limiting) |
| Email | Resend | No | Console logging |
| SMS | Twilio | No | Console logging |
| Object Storage | Cloudflare R2 | No | Portfolio uploads fail |
| Push Notifications | Expo | No | Console logging |
| Error Monitoring | Sentry | No** | No monitoring |

\* Redis is technically optional (graceful fallback) but **functionally required** because rate limiting is disabled without it.
\** Not currently integrated but should be before beta.

### Required Environment Variables

**Web App** (17 required, 9 optional):
```
# Required
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL

# Strongly Recommended
REDIS_URL                    # Rate limiting + caching
REDIS_TOKEN                  # Upstash REST API auth
RESEND_API_KEY              # Email notifications
EMAIL_FROM                  # Sender address

# Optional
TWILIO_ACCOUNT_SID          # SMS
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
R2_ACCOUNT_ID               # Portfolio uploads
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
EXPO_ACCESS_TOKEN           # Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY # Web push
```

**Worker App** (2 required, 6 optional):
```
# Required
DATABASE_URL
REDIS_URL

# Optional
RESEND_API_KEY, EMAIL_FROM
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
EXPO_ACCESS_TOKEN
```

---

## F. Security Audit Summary

### Authentication: SECURE
- All 27 authenticated routes verified — proper Clerk auth + provider ownership checks
- Multi-tenancy enforced throughout — no cross-provider data access possible
- Token-based auth (manageToken) correctly scoped to cancel/reschedule only

### Authorization: SECURE
- Provider scoping on all mutations
- Client-scoped appointments also verify `user.id === appointment.clientId`
- Public routes are intentionally public (booking, availability, provider profiles)

### Webhook Security: SECURE
- Stripe signature verification via `constructEvent()`
- Idempotency check (stripeEventId in event metadata)
- Returns success on duplicates

### File Uploads: SECURE
- Content-type whitelisting (images/videos only)
- Provider authentication required
- Presigned URL pattern (no server-side file handling)

### CORS/CSRF: SECURE
- No explicit CORS config needed (same-domain API routes)
- Clerk middleware handles CSRF for authenticated routes

---

## G. Production Launch Checklist

### Before Beta (P0)
- [ ] Configure Redis (Upstash) — rate limiting won't work without it
- [ ] Add status transition validation to appointment PATCH handler
- [ ] Add `strictRateLimit` to tip checkout endpoint
- [ ] Set up Sentry for web app + worker
- [ ] Create privacy policy + terms of service pages
- [ ] Update `docs/architecture.md` to match actual stack

### Before Public Launch (P1)
- [ ] Wrap recurring cancellation loop in single transaction
- [ ] Add database constraint preventing duplicate TIP payments
- [ ] Add cache invalidation on provider booking setting changes
- [ ] Document all env vars in `.env.example` files
- [ ] Add file size validation for avatar uploads
- [ ] Run `pnpm audit fix` for dependency vulnerabilities
- [ ] Set up Stripe webhooks for production domain
- [ ] Configure custom domain for Clerk
- [ ] Set `EMAIL_FROM` to verified custom domain

### Recommended Post-Launch (P2)
- [ ] Add health check endpoint (`/api/health`)
- [ ] Implement structured logging (pino)
- [ ] Add worker type checking to CI
- [ ] Set up uptime monitoring (e.g., BetterUptime)
- [ ] Configure backup strategy for PostgreSQL

---

## H. Verification Commands

```bash
# Type check all packages
cd apps/web && npx tsc --noEmit
cd packages/shared && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit

# Validate Prisma schema
cd packages/db && npx prisma validate

# Check migration status
cd packages/db && npx prisma migrate status

# Dependency audit
pnpm audit

# Verify Redis connectivity
curl -s https://your-upstash-url/ping

# Test Stripe webhook forwarding (local)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Verify all API routes have force-dynamic
grep -rL "force-dynamic" apps/web/src/app/api/**/route.ts
```
