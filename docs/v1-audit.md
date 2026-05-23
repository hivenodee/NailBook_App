# Porobook V1 Audit

Last updated: 2026-02-16

---

## 1. Repo Structure

```
nailbook/
  apps/
    web/          Next.js 15.5 — public booking + provider dashboard
    mobile/       Expo 52 — iOS/Android (screens stubbed, not production-ready)
    worker/       BullMQ background jobs — reminders, follow-ups, exports, cleanup
  packages/
    config/       Shared tsconfig presets (base, next, expo, node) + ESLint config
    db/           Prisma 6.19 schema, client export, seed script
    shared/       Zod validation schemas, TypeScript types, shared constants
```

Monorepo tooling: pnpm 9.15 workspaces + Turborepo.

### Key Config Files

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo pipeline (dev, build, lint) |
| `pnpm-workspace.yaml` | Workspace packages declaration |
| `packages/db/prisma/schema.prisma` | Single source of truth for data model |
| `apps/web/tailwind.config.ts` | Design tokens (colors, spacing, radii) |
| `apps/web/src/middleware.ts` | Clerk auth + public route matcher |

---

## 2. Data Model (Prisma)

### Core Models

| Model | Purpose |
|-------|---------|
| User | Clerk-linked account (CLIENT, PROVIDER, ADMIN roles) |
| Provider | Business profile, settings, payment preferences, booking controls |
| ProviderClient | Denormalized client record per provider (name, email, phone, notes) |
| Service | Catalog item (price, duration, deposit settings) |
| AddOnGroup | Groups add-ons with selection rules (OPTIONAL, EXACTLY_ONE, AT_LEAST_ONE) |
| AddOn | Extra option on a service (price, duration, mandatory flag) |
| AvailabilityRule | Weekly recurring schedule (day, start/end time, active toggle) |
| TimeOff | Date-range block-off |
| Appointment | Booking record linking provider, client, service, add-ons |
| AppointmentEvent | Immutable audit log per appointment |
| Payment | Financial record (DEPOSIT, FULL, BALANCE, REFUND types) |
| Payout | Stripe payout tracking |
| Thread / Message | In-app messaging tied to appointments |
| Feedback | Anonymous post-appointment feedback (optional rating, body, public toggle) |
| MediaAsset | Portfolio photos/videos (R2 storage) |
| Coupon | Discount codes (PERCENT or FIXED, service restrictions, usage limits) |
| WaitlistEntry | Per-slot or per-day waitlist with status workflow |
| MessageTemplate | Per-provider email/SMS template overrides |
| ExportJob | Async CSV export tracking |
| AccountActivityEvent | User account audit log |
| FavoriteProvider | Client favorites |

### Key Enums

| Enum | Values |
|------|--------|
| AppointmentStatus | DRAFT, PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW |
| PaymentType | DEPOSIT, FULL, BALANCE, REFUND |
| PaymentStatus | PENDING, COMPLETED, FAILED, REFUNDED |
| PaymentMethod | CARD, APPLE_PAY, GOOGLE_PAY, CASH_APP_PAY, CASH |
| DepositType | NONE, FLAT, PERCENT |
| WaitlistEntryStatus | ACTIVE, AVAILABLE, NOTIFIED, BOOKED, EXPIRED, CANCELLED |
| MessageTemplateType | BOOKING_CONFIRMATION, BOOKING_NOTIFICATION, CANCELLATION, COMPLETION, REMINDER, FOLLOWUP, WAITLIST_AVAILABLE, WAITLIST_JOINED, BALANCE_REQUEST |

---

## 3. V1 Feature Inventory

### 3.1 Public Booking Flow (Client)

**Provider Profile** — `/(public)/[slug]/page.tsx`
- Server-rendered page with OG metadata
- Cover image, bio, location, social links (Instagram, TikTok)
- Verification badge (admin-granted)
- Portfolio grid (3-column, max 20 visible items)
- Reviews summary card (average rating, count, link to full list)
- Service list with prices, durations, deposit info
- Books-closed banner with countdown timer when books are shut
- Payment method icons and cancellation policy display
- API: Direct Prisma queries (server component)

**Booking Funnel** — `/(public)/[slug]/book/page.tsx`
- Step 1 — Date picker (horizontal scroll, booking window enforced) + time slot grid
- Step 2 — Client details (name, email, phone)
- Step 3 — Confirmation (service summary, add-on breakdown, coupon input, payment method, policies)
- Add-on group rules enforced (EXACTLY_ONE = radio, AT_LEAST_ONE = checkbox required)
- Mandatory add-ons auto-selected and locked
- Waitlist form (day-level or per-slot) when all slots booked
- Deposit calculation: FLAT (capped at total) or PERCENT
- Cash payment only available when no deposit required
- Free bookings skip payment entirely
- API: `GET /api/services/:id`, `GET /api/availability/:slug`, `POST /api/coupons/validate`, `POST /api/waitlist`, `POST /api/appointments`

**Confirmation** — `/(public)/[slug]/confirmation/page.tsx`
- Polls `GET /api/appointments/:id` every 3s (max 60s) while PENDING_PAYMENT
- Shows success/failure/pending states
- Google Calendar link on confirmation
- Prompts for optional account creation / app download

**Balance Payment** — `/(public)/[slug]/pay/[appointmentId]/page.tsx`
- Shows total / deposit / remaining breakdown
- "Pay" button creates Stripe checkout via `POST /api/appointments/:id/balance/checkout`
- Polls balance endpoint after Stripe redirect until paid
- Shows "Balance Paid" when complete
- API: `GET /api/appointments/:id/balance`, `POST /api/appointments/:id/balance/checkout`

**Feedback** — `/(public)/[slug]/feedback/[appointmentId]/page.tsx`
- Anonymous, no auth required
- Optional 1-5 star rating (toggleable), required text body (max 2000 chars)
- Only available for COMPLETED appointments, one per appointment
- API: `POST /api/feedback`

**Public Reviews** — `/(public)/[slug]/reviews/page.tsx`
- Server-rendered aggregate stats (average rating, count)
- Lists all public feedback with star display
- API: Direct Prisma queries (server component)

### 3.2 Provider Dashboard

All dashboard pages require Clerk authentication and a Provider record.

**Layout** — `/dashboard/layout.tsx`
- Sticky nav: Today, History, Clients, Services, Hours, Money, Portfolio, Waitlist, Feedback, Messages, Coupons, Exports, Profile

**Today** — `/dashboard/page.tsx`
- Today's CONFIRMED + PENDING_PAYMENT appointments
- Status badges, time display in provider timezone
- Links to appointment detail
- API: `GET /api/appointments?status=CONFIRMED`, `GET /api/appointments?status=PENDING_PAYMENT`

**History** — `/dashboard/history/page.tsx`
- All appointments with tab-based status filtering
- Add-on tags display
- API: `GET /api/appointments?status={status}` (parallel fetches)

**Appointment Detail** — `/dashboard/appointments/[id]/page.tsx`
- Full appointment info: client, service, add-ons, date/time, notes, inspiration photo
- Payment summary (total, deposit, remaining)
- Remaining Balance section (when deposit exists):
  - "Send Payment Link" — Stripe checkout + email/SMS
  - "Mark as Cash Paid" — creates BALANCE payment record
  - "Balance Paid" indicator when collected
- Action buttons: Complete, Cancel, No-Show (provider only)
- Confirmation dialog for destructive actions
- Payment history list
- Activity log (event timeline)
- API: `GET /api/appointments/:id`, `PATCH /api/appointments/:id`, `POST /api/appointments/:id/collect-balance`

**Clients** — `/dashboard/clients/page.tsx`
- Searchable client list (name, email, phone)
- Visit count, last appointment date
- "New" badge for single-visit clients
- API: `GET /api/clients?search={query}`

**Client Detail** — `/dashboard/clients/[id]/page.tsx`
- Profile header, visit count, total spent, last visit
- Editable internal notes (auto-save)
- Appointment history
- API: `GET /api/clients/:id`, `PATCH /api/clients/:id`

**Services** — `/dashboard/services/page.tsx`
- Service cards with price, duration, deposit info
- Create new service inline form
- Toggle active/inactive
- Copy shareable booking link
- API: `GET /api/providers/me`, `GET /api/services`, `POST /api/services`, `PATCH /api/services/:id`

**Service Detail** — `/dashboard/services/[id]/page.tsx`
- Edit service fields (name, price, duration, deposit type/value)
- Add-on management with group rules
- Create/edit/delete add-on groups
- Create/edit/delete add-ons within groups
- API: `GET /api/services/:id`, `PATCH /api/services/:id`, plus add-on/group CRUD endpoints

**Hours (Availability)** — `/dashboard/availability/page.tsx`
- Weekly schedule: per-day toggle, start/end time selects (15-min intervals, 6am-11pm)
- Time-off blocks: create date ranges, delete existing
- API: `GET/POST /api/availability/rules`, `GET/POST /api/availability/time-off`, `DELETE /api/availability/time-off/:id`

**Money** — `/dashboard/money/page.tsx`
- Analytics dashboard: Revenue, Lost, Recovered, Net KPI cards
- Revenue chart (Line chart via Recharts): daily/weekly/monthly/yearly granularity
- Range filters: 7D, 30D, 90D, YTD, All
- Transaction list: paginated, filterable by payment status
- Payment type labels: Deposit, Full payment, Balance, Refund
- API: `GET /api/dashboard/analytics`, `GET /api/payments`

**Portfolio** — `/dashboard/portfolio/page.tsx`
- 3-column media grid
- Upload to R2 via presigned URL (2-step: POST metadata, PUT file)
- Show/hide toggle per asset
- Delete asset
- MIME type validation, 50-item limit
- API: `GET /api/providers/me`, `GET/POST /api/media`, `PATCH/DELETE /api/media/:id`

**Waitlist** — `/dashboard/waitlist/page.tsx`
- Filterable by status (ACTIVE, AVAILABLE, NOTIFIED, EXPIRED, ALL)
- Per-slot time + day-level entries
- Approve button (AVAILABLE only) — sends notification email/SMS
- Delete entry
- Paginated
- API: `GET /api/waitlist/entries`, `POST /api/waitlist/entries/:id/approve`, `DELETE /api/waitlist/entries/:id`

**Feedback** — `/dashboard/feedback/page.tsx`
- Filter tabs: All, Public, Private
- Star rating display, body text
- Toggle public/private per feedback
- API: `GET /api/feedback`, `PATCH /api/feedback/:id`

**Messages (Templates)** — `/dashboard/messages/page.tsx`
- Customizable email + SMS templates for all notification types
- Variable chips with cursor insertion
- Preview with sample data
- Reset to default
- "Customized" badge on modified templates
- API: `GET /api/message-templates`, `PUT /api/message-templates`, `POST /api/message-templates/preview`

**Coupons** — `/dashboard/coupons/page.tsx`
- Create codes (PERCENT or FIXED, optional expiry, usage limit, service restrictions)
- Code auto-uppercased, uniqueness enforced
- Toggle active/inactive
- Usage count display
- API: `GET /api/providers/me`, `GET /api/services`, `GET/POST /api/coupons`, `PATCH /api/coupons/:id`

**Profile** — `/dashboard/profile/page.tsx`
- Business info: name, bio, location
- Social links: Instagram, TikTok URLs
- Payment methods: Card, Apple Pay, Google Pay, Cash App Pay, Cash toggles
- Booking controls: Open/Closed toggle, scheduled opening (date + time), booking window presets (1W/2W/1M/3M/1Y)
- Policies: cancellation hours, arrival grace minutes
- API: `GET/PATCH /api/providers/me`

### 3.3 Payments

- Stripe checkout for deposits (DEPOSIT) and full payments (FULL)
- Balance collection: Stripe checkout (BALANCE type) or cash marking
- Webhook handler for `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
- BALANCE payments do not change appointment status
- Idempotency via `stripeEventId` in event metadata
- Provider Stripe Connect support (`stripeAccountId` → `transfer_data.destination`)
- Payment methods: Card, Apple Pay, Google Pay, Cash App Pay, Cash

### 3.4 Notifications

- Email via Resend (graceful fallback to console logging)
- SMS via Twilio (graceful fallback to console logging)
- Customizable templates per provider with `{{variable}}` syntax
- Template types: Booking Confirmation, Booking Notification (provider), Cancellation, Completion, Reminder, Follow-up, Waitlist Available, Waitlist Joined, Balance Request
- Background jobs (BullMQ via worker app): 24h reminder, 2h reminder, 2h post-completion follow-up

### 3.5 Caching

- Redis (Upstash) availability cache with 300s TTL
- Centralized cache module with invalidation functions
- Cache invalidated on: booking creation, appointment status changes, reschedules, webhook events, availability rule updates, time-off changes
- Graceful no-op when Redis not configured

---

## 4. Services and Infrastructure

### 4.1 External Services

| Service | Purpose | Required | Graceful Fallback |
|---------|---------|----------|-------------------|
| Clerk | Authentication (web + mobile) | Yes | No |
| PostgreSQL (Neon) | Primary database via Prisma | Yes | No |
| Stripe | Payments, checkout sessions, webhooks | Yes (for paid bookings) | Cash-only mode works without |
| Resend | Transactional email | No | Logs to console |
| Twilio | SMS notifications | No | Logs to console |
| Cloudflare R2 | Portfolio media storage | No | Portfolio uploads disabled |
| Redis (Upstash) | Availability caching + BullMQ jobs | No | Uncached availability, no background jobs |

### 4.2 Environment Variables

**Web App (`apps/web/.env.local`)**

| Variable | Required | Purpose |
|----------|----------|---------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk frontend auth |
| CLERK_SECRET_KEY | Yes | Clerk backend auth |
| STRIPE_SECRET_KEY | Yes | Stripe API access |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Yes | Stripe frontend |
| STRIPE_WEBHOOK_SECRET | Yes | Webhook signature verification |
| NEXT_PUBLIC_APP_URL | Yes | Base URL for links in emails |
| RESEND_API_KEY | No | Email sending (logs if unset) |
| EMAIL_FROM | No | Sender address (defaults to onboarding@resend.dev) |
| REDIS_URL | No | Upstash Redis REST URL |
| REDIS_TOKEN | No | Upstash Redis REST token |
| R2_ACCOUNT_ID | No | Cloudflare account |
| R2_ACCESS_KEY_ID | No | R2 auth |
| R2_SECRET_ACCESS_KEY | No | R2 auth |
| R2_BUCKET_NAME | No | R2 bucket |
| R2_PUBLIC_URL | No | Public media URL |
| TWILIO_ACCOUNT_SID | No | Twilio auth |
| TWILIO_AUTH_TOKEN | No | Twilio auth |
| TWILIO_FROM_NUMBER | No | SMS sender number |

**Worker (`apps/worker/.env`)**

| Variable | Required | Purpose |
|----------|----------|---------|
| DATABASE_URL | Yes | PostgreSQL |
| REDIS_URL | Yes | BullMQ job queue |
| RESEND_API_KEY | No | Email sending from jobs |
| EMAIL_FROM | No | Sender address |

**Mobile (`apps/mobile/.env`)**

| Variable | Required | Purpose |
|----------|----------|---------|
| EXPO_PUBLIC_API_URL | Yes | Backend URL |
| EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk auth |

### 4.3 Webhook Endpoints

| Endpoint | Provider | Events |
|----------|----------|--------|
| POST `/api/webhooks/stripe` | Stripe | checkout.session.completed, checkout.session.expired, charge.refunded |

Configure in Stripe dashboard: `https://yourdomain.com/api/webhooks/stripe`

Local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 5. Backend Architecture

### 5.1 Availability Computation

1. Client requests `GET /api/availability/:slug?date=YYYY-MM-DD`
2. Check Redis cache first (300s TTL)
3. If books are closed (`booksOpen === false`), return early with `booksOpen: false` and optional `booksOpenAt`
4. Auto-open books if `booksOpenAt` has passed
5. Check booking window (`bookingWindowDays` from today)
6. Fetch provider's `AvailabilityRule` for the day-of-week
7. Convert wall-clock start/end times to UTC using `wallClockToUTC(date, hour, minute, timezone)`
8. Generate 30-minute slots between start and end times
9. Fetch existing CONFIRMED + PENDING_PAYMENT appointments for the date
10. Fetch time-off blocks overlapping the date
11. Mark slots as unavailable if they overlap with booked appointments or time-off
12. Cache result in Redis, return slots array

### 5.2 Booking Flow

1. Client selects service, date, time, enters details
2. `POST /api/appointments` validates:
   - Books open status and booking window
   - Add-on group rules (EXACTLY_ONE, AT_LEAST_ONE, OPTIONAL)
   - Coupon validity (active, not expired, usage limit, service restriction)
   - Time slot availability (no overlapping appointments)
   - Payment method acceptance (cash only if no deposit)
3. Calculates total (service + add-ons - discount), deposit amount
4. Creates appointment in PENDING_PAYMENT or CONFIRMED status
5. For paid bookings: creates Stripe checkout session, returns `checkoutUrl`
6. For cash/free bookings: confirms immediately, sends confirmation email/SMS, schedules reminders
7. Invalidates availability cache for the booked date
8. Marks matching waitlist entries as BOOKED

### 5.3 Payment Flow

```
PENDING_PAYMENT → Stripe Checkout → Webhook (checkout.session.completed)
                                       ↓
                                   Create Payment (DEPOSIT or FULL, COMPLETED)
                                   Update Appointment → CONFIRMED
                                   Send confirmation email/SMS
                                   Schedule reminders
                                   Invalidate cache

CONFIRMED → Provider marks complete → COMPLETED
                                       ↓
                                   Send completion email (with balance pay link if applicable)
                                   Schedule follow-up

COMPLETED → Provider sends balance link → Stripe Checkout → Webhook
              or marks cash paid             ↓
                                       Create Payment (BALANCE, COMPLETED)
                                       Log event (no status change)
```

### 5.4 State Machine

```
DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED
                              ↓            ↓
                          CANCELLED    NO_SHOW
                              ↑
                          (from CONFIRMED only)
```

Actions by role:
- Provider: accept, complete, cancel, reschedule, no_show
- Client: cancel
- System: confirm (via webhook), expire (via webhook)

### 5.5 Waitlist Workflow

```
Client joins → ACTIVE
Slot frees up (cancel/reschedule/no-show/webhook expire) → AVAILABLE
Provider approves → NOTIFIED (email/SMS sent with booking link)
Client books → BOOKED
Past date → EXPIRED (auto-expired on list fetch)
```

---

## 6. UI Map

### Public Pages

| Route | Page | Component Type |
|-------|------|----------------|
| `/` | Home / landing | Static |
| `/:slug` | Provider profile | Server component |
| `/:slug/book?serviceId=` | Booking funnel (3 steps) | Client component |
| `/:slug/confirmation?appointmentId=` | Payment confirmation | Client component |
| `/:slug/pay/:appointmentId` | Balance payment | Client component |
| `/:slug/feedback/:appointmentId` | Feedback form | Client component |
| `/:slug/reviews` | Public reviews | Server component |

### Dashboard Pages

| Route | Page |
|-------|------|
| `/dashboard` | Today view |
| `/dashboard/history` | Appointment history |
| `/dashboard/appointments/:id` | Appointment detail |
| `/dashboard/clients` | Client list |
| `/dashboard/clients/:id` | Client detail |
| `/dashboard/services` | Service list + create |
| `/dashboard/services/:id` | Service editor + add-ons |
| `/dashboard/availability` | Weekly hours + time-off |
| `/dashboard/money` | Analytics + transactions |
| `/dashboard/portfolio` | Media management |
| `/dashboard/waitlist` | Waitlist entries |
| `/dashboard/feedback` | Feedback management |
| `/dashboard/messages` | Message templates |
| `/dashboard/coupons` | Coupon management |
| `/dashboard/exports` | CSV data export |
| `/dashboard/profile` | Business settings |

### Components

| Component | Location | Used By |
|-----------|----------|---------|
| ServiceList | `components/ServiceList.tsx` | Provider profile page |
| BooksClosedCard | Inline in book page | Booking funnel, confirmation |
| WaitlistForm | Inline in book page | Booking funnel |

### Gaps vs design.md

| design.md Feature | Status |
|-------------------|--------|
| Provider mobile app (primary surface) | Screens stubbed, not functional |
| Client mobile app | Screens stubbed, not functional |
| Push notifications | Not implemented (no push infra) |
| In-app messaging (real-time) | Templates only, no real-time chat |
| Client discovery feed | API exists (`GET /api/providers`), no web UI |
| Biometric login | Not implemented |
| Review evidence submission | Not implemented |
| Manual dispute flagging | Not implemented |
| Provider data export (CSV) | Worker job exists, no download UI |

---

## 7. Readiness Checklist

### Production Configuration Required

- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure Stripe production keys (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- [ ] Register Stripe webhook endpoint (`https://yourdomain.com/api/webhooks/stripe`) and set STRIPE_WEBHOOK_SECRET
- [ ] Configure Resend account and set RESEND_API_KEY + EMAIL_FROM
- [ ] Configure Twilio account and set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
- [ ] Configure Cloudflare R2 bucket and set R2_* env vars
- [ ] Configure Upstash Redis and set REDIS_URL + REDIS_TOKEN
- [ ] Configure Clerk production instance keys
- [ ] Set DATABASE_URL to production PostgreSQL
- [ ] Deploy worker app with Redis connection for background jobs
- [ ] Run `prisma db push` or `prisma migrate deploy` against production database

### Documentation Issues Found

- [x] `.env.local.example` references Postmark but code uses Resend — **FIXED**: Updated to Resend with setup instructions
- [x] `.env.local.example` is missing RESEND_API_KEY, EMAIL_FROM, DATABASE_URL, Clerk keys — **FIXED**: All vars added
- [x] `apps/worker/.env.example` references Postmark — **FIXED**: Updated to Resend
- [x] `apps/worker/.env.example` missing REDIS_TOKEN, R2_ACCOUNT_ID, R2_PUBLIC_URL — **FIXED**: All vars added

### Middleware / Routing

- [x] Add `/:slug/pay/(.*)` explicitly to middleware public route matcher — **FIXED**: Added to `createRouteMatcher` in `middleware.ts`

### Security Review

- [x] `GET /api/appointments/:id` is fully public (no auth) — appointment CUID acts as token. Acceptable for V1.
- [x] `GET /api/appointments/:id/balance` is public — same CUID-as-token pattern.
- [x] `POST /api/appointments/:id/balance/checkout` is public — **Rate limited** (strict: 10 req/min per IP).
- [x] `POST /api/feedback` is public and unauthenticated — **Rate limited** (strict: 10 req/min per IP).
- [x] Rate limiting added to public write endpoints via `@upstash/ratelimit` — **FIXED**: Applied to POST /api/appointments, POST /api/feedback, POST /api/appointments/:id/balance/checkout, POST /api/coupons/validate, POST /api/waitlist. Graceful no-op when Redis not configured.
- [ ] No CSRF protection beyond Clerk session cookies.
- [x] Stripe webhook verifies signature (good).
- [ ] No file type/size validation on R2 upload beyond MIME check — client uploads directly to presigned URL.

### Testing Gaps

- [x] Minimal automated test suite added — **FIXED**: 48 unit tests across 4 test files covering core V1 logic (pricing, slots, timezone, templates). Vitest runner, wired into CI.
- [x] Manual testing has been performed for core flows
- [x] CI/CD pipeline configured — **FIXED**: GitHub Actions workflow at `.github/workflows/ci.yml` (lint, type-check, build, migration safety check)

### Data Integrity

- [x] Database migrations initialized — **FIXED**: Baseline migration at `packages/db/prisma/migrations/0001_baseline/migration.sql`, `prisma migrate deploy` scripts added. Future changes use `prisma migrate dev`.
- [ ] Waitlist compound unique includes nullable `targetTime` — uses findFirst+create workaround (documented)
- [ ] AppointmentEvent audit log has no foreign key to User (actorId is string, not relation) — intentional for system events
- [ ] No soft-delete on any model — hard deletes for media, waitlist entries, time-off

### Mobile App

- [ ] Screen files exist but are stubs — not functional
- [ ] API client (`apps/mobile/src/lib/api.ts`) is implemented
- [ ] Auth flow (`apps/mobile/src/lib/auth.ts`) is implemented
- [ ] No navigation between screens is wired up beyond layouts

### Missing Features (referenced in design.md but not built)

- [ ] Push notifications
- [ ] Real-time in-app messaging (only templates exist)
- [ ] Client discovery feed (web UI)
- [ ] Biometric login
- [ ] Review evidence / dispute workflow
- [x] CSV export download UI — **DONE**: Synchronous CSV generation in POST /api/exports, download via GET /api/exports/:id/download, dashboard UI at /dashboard/exports
- [ ] Payout visibility dashboard (model exists, no UI)
- [ ] Provider verification workflow (badge exists, no admin UI to grant)
- [ ] Account activity log UI (model exists, no frontend)

### Console Logging

All console statements use appropriate prefixes:
- `[email-dev]` / `[sms-dev]` / `[jobs-dev]` — dev-only, guarded by env checks
- `[email]` / `[sms]` / `[jobs]` / `[waitlist]` — error logging in catch blocks

No cleanup needed. These are appropriate for production logging.

### Hardcoded Values

- All URLs use `process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"` fallback pattern
- Sample data in `templates.ts` SAMPLE_VARS uses `porobook.app` placeholder domain
- No hardcoded secrets or test API keys
- Stripe API version pinned to `"2025-02-24.acacia"` (correct for installed SDK)
