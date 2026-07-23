# PoroBook — Product Spec

Detailed feature breakdown. Use this when asking Claude about specific functionality or planning new features.

---

## V1 scope (the rule)

If something isn't on this list, it's out of scope for V1. Don't add it without explicit user direction. PoroBook's MVP is opinionated and narrow on purpose.

---

## Client-side features (public web flow)

The public flow is the primary V1 client surface. A client never has to create an account or install an app to book.

### Provider profile (`/[slug]`)
- Editorial header with cover image (3:1 banner on desktop) + avatar overlap (X/Twitter pattern)
- Business name, "Verified" badge (when applicable), bio, location
- Portfolio grid (photos/videos, hidden assets filtered out for clients)
- Reviews summary (aggregate rating + count, links to full reviews page)
- Service list with prices, deposits, add-ons, durations
- Instagram + TikTok links
- "Books closed" banner with scheduled-opening countdown when applicable
- Sticky bottom "Book now" bar on mobile

### Reviews page (`/[slug]/reviews`)
- Aggregate rating (avg + count)
- Individual reviews (rating + text + service + date)
- Provider-controlled visibility (private/public per review)

### Booking flow (`/[slug]/book?service=…`)
A 4-step horizontal slide:
1. **Time** — date scrubber, slot picker, add-on selection, recurrence toggle (weekly / biweekly / monthly × N), waitlist if no slots
2. **Details** — name, email, phone (no account required)
3. **Intake** *(only if provider has intake questions)* — text / dropdown / checkbox responses, optional inspiration photo upload
4. **Review** — price breakdown, deposit calc, coupon application, payment method selection (Card, Apple Pay, Google Pay, Cash App Pay, Cash)

Constraints:
- Provider's `bookingWindowDays` limits how far ahead clients can book
- Buffer time between appointments enforced
- Cash requires no deposit
- Free services skip Stripe entirely

### Confirmation (`/[slug]/confirmation?appointment=…`)
- Booking summary
- Add to calendar (.ics download)
- Polling-based confirmation status (waits for Stripe webhook)
- Optional "Save to home screen" prompt

### Self-manage (`/[slug]/manage/[appointmentId]?token=…`)
- Token-authenticated link from confirmation email
- View appointment details
- Reschedule with new date/time picker
- Cancel (subject to provider's cancellation window)
- Status banner if outside the cancellation window
- Sends reschedule confirmation email when used

### Pay balance (`/[slug]/pay/[appointmentId]`)
- For appointments with a deposit + remaining balance
- Shows total, deposit paid, balance paid (if any), remaining
- Stripe checkout for remaining balance
- Sends receipt email after payment completes

### Leave feedback (`/[slug]/feedback/[appointmentId]`)
- Triggered from completion email
- Optional star rating (1–5)
- Body text (1–2000 chars)
- Anonymous to clients; provider sees it in dashboard
- Provider can choose to make it public (shown on reviews page)

### Tip (`/[slug]/tip/[appointmentId]`)
- Triggered from completion email (when provider hasn't already received cash tip)
- Preset amounts ($5, $10, $15, $20) + custom amount
- Stripe checkout, $1–$100 range
- Sends thank-you after payment completes

---

## Provider features (web dashboard)

Auth: Clerk. Provider has a row in the `Provider` table linked 1:1 to their `User` row.

### Today (`/dashboard`)
- Greeting + date
- 3 KPI cards: today's bookings, today's revenue, pending payment count
- Timeline of today's appointments
- Recent activity feed (last 6 bookings)
- Quick-link Share button to copy public booking URL

### Calendar (`/dashboard/calendar`)
- Week + month view
- Drag to block time
- Click slot to create / view appointment

### Appointments / history (`/dashboard/history`)
- Time-bucketed list (Today, Tomorrow, This week, future per-date, past)
- Filter by status (Confirmed, Pending, Completed, Cancelled, No-show)
- Search by client name
- Per-row actions: complete, cancel, no-show

### Appointment detail (`/dashboard/appointments/[id]`)
- Full info: client, service, add-ons, total, deposit, intake responses, payments, activity log
- Actions: complete, cancel, no-show, send payment link, mark balance as cash paid
- Toast feedback on actions

### Clients (`/dashboard/clients`)
- Card grid, search, filter (All / New / Returning), sort (Recent / Lifetime spend / First visit)
- Per-client: name, contact, lifetime spend, first appointment date, visit count

### Client detail (`/dashboard/clients/[id]`)
- Profile + lifetime stats
- Internal notes (provider-only, never shown to client)
- Full appointment history with statuses

### Services (`/dashboard/services`)
- List of services with hide/show toggle, copy share link
- Side drawer for create flow

### Service detail / edit (`/dashboard/services/[id]`)
- Name, description, price, duration
- Deposit configuration (none / flat $ / percent %)
- Add-on groups (with selection rules: optional / exactly-one / at-least-one)
- Mandatory add-ons
- Intake questions (text / dropdown / checkbox), required flag

### Availability / hours (`/dashboard/availability`)
- Weekly recurring schedule (per day)
- Time-off blocks (date range with reason)

### Portfolio (`/dashboard/portfolio`)
- CSS columns masonry grid
- Drag-drop upload zone (via R2 presigned URLs)
- Hide/unhide individual assets
- Cover image (3:1 banner shown on public profile)
- Avatar upload with circular crop

### Money (`/dashboard/money`)
- Range / granularity controls (7d / 30d / 90d / custom; daily / weekly / monthly)
- Revenue chart (Net / Revenue / Lost)
- 4 KPI cards: gross, net, fees, average ticket
- Pay-out row showing scheduled / pending / completed
- Recent transactions list
- CSV export

### Feedback (`/dashboard/feedback`)
- All reviews (private + public)
- Rating filter
- Toggle each review's public visibility

### Waitlist (`/dashboard/waitlist`)
- Active / Available / Approved / Declined tabs
- Per-slot listing with client info
- Approve / decline actions

### Coupons (`/dashboard/coupons`)
- Create flat $ or percent % discount
- Optional expiration date, max uses, service scoping
- Active / Expired filter

### Messages (`/dashboard/messages`)
- Two-pane: thread list left, conversation right
- Thread tied to appointment
- Send/receive (text only; no typing indicators, no read receipts per V1 scope)

### Templates (`/dashboard/messages/templates`)
- 8 template types editable per provider:
  - BOOKING_CONFIRMATION, BOOKING_NOTIFICATION (provider), CANCELLATION, COMPLETION, REMINDER, FOLLOWUP, WAITLIST_AVAILABLE, WAITLIST_JOINED
  - Plus BALANCE_REQUEST and TIP_REQUEST
- Per-template: email subject, email body, SMS body
- Variable substitution: `{{providerName}}`, `{{serviceName}}`, `{{clientName}}`, `{{dateTime}}`, etc.
- Preview pane with sample data substituted

### Exports (`/dashboard/exports`)
- Tabs: Import / Export
- Import: drag-drop CSV (client list), columns: email* / name / phone / notes. Works with Square, Acuity, GlossGenius, Vagaro exports.
- Export: type (Appointments / Clients / Transactions) × date range (7d / 30d / 90d / custom). Async job with status polling, CSV download when ready.

### Reminders (`/dashboard/reminders`)
- 4 slot types: 24h before, 1h before, follow-up after, rebook-after-4-weeks
- Currently only 24h + 1h fully wired (schema gap for "after appointment" timing — see `06-decisions-and-open-questions.md`)
- Per-slot: enabled toggle, channel chips (SMS / Email), edit-message drawer
- Delivery stats card: sent / delivered / failed this month
- Pulls from `NotificationLog` table

### Profile (`/dashboard/profile`)
- 3 sections separated by SectionHeader pattern (rust accent line + uppercase eyebrow + Heading h2)
- **Public profile**: cover image upload (with 3:1 crop modal), avatar upload (with circular crop), business name, bio, location + lat/lng, specialty chips, Instagram / TikTok URLs, payment method toggles (5 methods), booking controls (open/closed + scheduled open + window chips + buffer chips), policies (cancellation hours, arrival grace)
- **Account settings**: email + password link to Clerk portal, notification preference stubs (no backend yet)
- **Verification**: status card (verified vs not — currently admin-set via Prisma)
- Sticky save bar (mobile: full-width bottom; desktop: floating bottom-right)

### Notifications (`/dashboard/notifications`)
- Currently shows outbound delivery log (legacy view)
- Inbox / Settings tabs were discussed but deferred — open question

---

## Background jobs (BullMQ worker)

| Job | Schedule | What it does |
|---|---|---|
| Reminders | When appointment is within reminder window | Send 24h / 1h reminder email + SMS |
| Follow-ups | 2h after completed appointment | Send completion thank-you with feedback URL + tip URL |
| Exports | When provider requests | Generate CSV, upload to R2, mark export job COMPLETED |
| Cleanup | Every 15 min | Cancel orphaned PENDING_PAYMENT appointments older than 1h |
| Push receipt | Every 5 min | Record push-notification delivery status |
| Notification retry | Every 15 min | Retry failed email/SMS sends (with exponential backoff) |

All jobs log to `NotificationLog` (or `ExportJob`) for audit trail. Worker dies on Neon idle disconnect (known issue, see `06-decisions-and-open-questions.md`).

---

## API surface (summary)

REST endpoints under `/api/`:

**Public (no auth)**
- `GET /api/availability/[slug]?date=…` — slot list for a provider on a date
- `GET /api/providers/[slug]/reviews` — public reviews
- `POST /api/coupons/validate` — check coupon code
- `POST /api/appointments` — create appointment (returns Stripe checkout URL or confirmed booking)
- `POST /api/feedback` — submit feedback
- `POST /api/waitlist` — join waitlist
- `GET/PATCH /api/appointments/[id]?token=…` — self-manage (token auth)
- `POST /api/appointments/[id]/balance/checkout` — pay remaining balance
- `POST /api/appointments/[id]/tip/checkout` — leave tip

**Provider (Clerk auth)**
- `GET/PATCH /api/providers/me` — provider profile
- `POST /api/providers/me/avatar` + `/cover` — presigned R2 upload URLs
- `GET /api/clients` + `GET /api/clients/[id]` — clients
- `PATCH /api/clients/[id]` — internal notes
- Services, services/intake, services/addon-groups CRUD
- Availability rules, time-off CRUD
- Media (portfolio) CRUD
- Coupons CRUD
- Messages threads + send
- Message templates CRUD + preview
- Reminders settings CRUD
- Notification log + reminder stats
- Exports + Imports
- Waitlist entries + approve / decline

**Webhooks**
- `POST /api/webhooks/stripe` — handles `checkout.session.completed` for DEPOSIT, BALANCE, TIP, and FULL payments

**Conventions**
- Response envelope: `{ data: T }` for success, `{ error: { message: string } }` for failure
- All routes: `export const dynamic = "force-dynamic"`
- Rate limiting via `rateLimit()` / `strictRateLimit()` from `lib/rate-limit.ts` (Redis-backed, no-op fallback documented)
- All amounts stored in cents (integer), displayed in dollars

---

## Out of scope for V1 (explicitly)

Per `claude.md` product guardrails, do NOT add:
- Two-way calendar sync (Google Calendar, iCal)
- Analytics dashboards beyond money page
- Loyalty / rewards / referral programs
- Gift cards
- Boosted listings / paid placement
- Subscriptions
- Instant payouts
- Inventory / expense tracking
- Education marketplace
- Expansion to non-beauty verticals
- Trending algorithms

These are V2+ features. Don't propose them as solutions unless explicitly asked.

---

## Mobile app (Expo) — V1 status

The mobile app exists in `apps/mobile/` but is **deferred**. The web booking flow IS the V1 client experience. Mobile is for V2 when there's signal that native is needed.
