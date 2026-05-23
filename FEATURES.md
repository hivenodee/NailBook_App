# Porobook — Feature Summary

A complete inventory of every feature shipped in the Porobook V1 web platform.

---

## Public Booking Flow

The booking flow is the core product surface — a mobile-optimized web experience accessible from any social bio link. A first-time client can go from tapping a link to a confirmed, paid appointment in under 90 seconds.

### Provider Profile Page (`/:slug`)

- Business name, bio, and location display
- Cover image with portfolio grid (photos and videos, tight mosaic layout)
- Verification badge (admin-granted)
- Social links (Instagram, TikTok)
- Payment method badges (Card, Apple Pay, Google Pay, Cash App Pay, Cash)
- Service cards with pricing, duration, and deposit info
- "Book Now" buttons per service (disabled when books are closed)
- "Books Closed" banner with live countdown timer when a scheduled opening is set (auto-refreshes on expiry)
- Reviews summary section — average rating, review count, and "View all reviews" link (only shown when public reviews exist)

### Service List

- Service name, description, price, and duration
- Deposit info inline (flat dollar amount or percentage)
- Add-ons listed per service
- Direct booking link per service (`/:slug?service=<id>`)

### Booking Page (`/:slug/book`)

- **Step 1 — Select Service**: Dynamically updates price, duration, and available add-ons
- **Step 2 — Select Date**: Calendar date picker respecting the provider's booking window (1 week to 1 year ahead)
- **Step 3 — Select Time**: 15-minute slot picker populated from availability API; unavailable slots shown but not selectable
- **Add-ons**: Selection rules per group — Optional, Exactly One, At Least One; mandatory add-ons auto-included
- **Inspiration Photo**: Optional upload (when provider requires it)
- **Coupon Code**: Real-time validation with discount preview (percent or fixed)
- **Client Info**: Name, email, phone
- **Payment Method**: Only shows methods the provider accepts
- **Price Breakdown**: Service base + add-ons - discount = total; deposit amount shown separately
- **Policies**: Arrival grace period and cancellation policy displayed before checkout
- **Submit**: Creates appointment via API; redirects to Stripe Checkout for card/digital wallet payments; cash bookings confirm immediately

### Confirmation Page (`/:slug/confirmation`)

- Appointment details: service, date/time, provider, price breakdown
- Confirmation number
- "Add to Google Calendar" button with pre-filled event
- Payment status polling (for Stripe sessions — polls until payment completes or expires)
- Optional app download prompt (never forced)

### Balance Payment Page (`/:slug/pay/:appointmentId`)

- Shows after appointment completion when a balance is owed
- Balance breakdown: total price - deposit paid - any prior balance payments = remaining
- "Pay Now" button redirects to Stripe Checkout for the exact remaining amount
- Success polling after Stripe redirect
- Shows "Paid" state once balance is settled

### Feedback Form (`/:slug/feedback/:appointmentId`)

- No authentication required (anonymous by design)
- Optional 1–5 star rating
- Required text feedback (1–2,000 characters)
- One submission per appointment (enforced server-side)
- Provider can later toggle feedback to public/private

### Public Reviews Page (`/:slug/reviews`)

- Lists all provider-approved public feedback
- Each review shows: star rating (if given), feedback text, service name, appointment date
- Aggregate stats at top: average rating and total review count

---

## Provider Dashboard

The web dashboard gives providers full control over their business. Every page uses animated skeleton loading states and a consistent warm design token system.

### Navigation

- Desktop sidebar with 4 sections (Main, Services, Growth, Operations) + mobile bottom tabs with "More" sheet
- `border-b-2 border-primary` underline active state (not filled pills)
- 6px dot indicators on key items (not number badges)
- Links: Today, Calendar, History, Clients, Services, Hours, Money, Portfolio, Waitlist, Feedback, Messages, Coupons, Exports, Reminders, Notifications, Profile

### Today View (`/dashboard`)

- Upcoming appointments from start of today onward
- Grouped by date with appointment cards showing: client name, service, time, status badge, total price, deposit amount
- Filtered to CONFIRMED and PENDING_PAYMENT statuses
- Click through to full appointment detail

### Appointment Detail (`/dashboard/appointments/:id`)

- Full appointment info: service with add-ons, client contact info, timing, financial breakdown
- **Status actions** (contextual):
  - CONFIRMED: Complete, Cancel, No-Show, Reschedule
  - PENDING_PAYMENT: Cancel
  - COMPLETED/CANCELLED/NO_SHOW: View-only
- Activity timeline — every status change, payment event, and action logged with timestamp and actor
- Payment history — all payments associated with the appointment
- Client visit history — other appointments with the same client
- Provider notes field (editable)
- **Remaining Balance section** (when balance is owed):
  - "Send Payment Link" — creates Stripe session + sends email and SMS with pay link
  - "Mark as Cash Paid" — records a cash payment immediately
  - Shows "Balance Paid" badge when fully collected

### History (`/dashboard/history`)

- All appointments with status filter tabs (All, Confirmed, Completed, Cancelled, No-Show)
- Each entry shows: client, service, date/time, status badge, total
- Click through to appointment detail

### Clients (`/dashboard/clients`)

- Searchable client directory (by name, email, or phone)
- Each entry shows: name, email, phone, appointment count, last visit date
- Click through to client detail with full appointment history
- Editable fields: name, phone, internal notes

### Services (`/dashboard/services`)

- List of all services with: name, price, duration, deposit info, active/inactive status
- **Create Service** form: name, description, price, duration, deposit type (None / Flat $ / Percent %), deposit value
- **Toggle Active/Inactive** per service
- **Copy Direct Link** button (`/:slug?service=<id>`)
- Click through to service editor

### Service Editor (`/dashboard/services/:id`)

- Edit all service fields: name, description, price, duration, deposit settings
- **Add-On Groups**: Create groups with selection rules (Optional, Exactly One, At Least One); edit name, rule, sort order; delete
- **Add-Ons**: Create add-ons with name, price, duration, optional group assignment, mandatory flag; edit; delete; reorder

### Hours / Availability (`/dashboard/availability`)

- **Weekly Schedule**: Set start/end times per day of week (Monday–Sunday); toggle days on/off; bulk save
- **Time-Off Blocks**: Create date ranges with optional reason; view upcoming blocks; delete
- All times are wall-clock in the provider's timezone (converted to UTC for storage and queries)

### Money (`/dashboard/money`)

- **Analytics Section**:
  - Configurable time range (7 days, 30 days, 90 days, 1 year, all time)
  - Granularity toggle (Daily, Weekly, Monthly, Yearly)
  - KPI cards: Total Revenue, Lost (cancelled/no-show), Recovered, Net
  - Line chart visualization of revenue over time
- **Transaction Ledger**:
  - Paginated list of all payments
  - Status filter (All, Completed, Pending, Failed, Refunded)
  - Each entry shows: date, client, service, amount, payment type (Deposit/Full/Balance/Refund), status, method (Card/Apple Pay/Google Pay/Cash App Pay/Cash)

### Portfolio (`/dashboard/portfolio`)

- Grid of uploaded media assets (photos and videos)
- Upload from device (JPEG, PNG, WebP, MP4, MOV — max 10MB, max 50 items)
- Reorder via sort controls
- Hide/Show toggle per asset (hidden assets don't appear on public profile)
- Delete assets

### Waitlist (`/dashboard/waitlist`)

- List of all waitlist entries with status tabs: Active, Available, Notified, Booked, Expired, Cancelled
- Each entry shows: client name/email/phone, target date, target time or time preference, service, status, created date, last notified date
- **Approve** button on Active entries to mark slot as Available
- Automatic expiration of past-date entries

### Feedback (`/dashboard/feedback`)

- Filter tabs: All, Public, Private
- Each entry shows: star rating (if given), feedback text, service name, appointment date
- **Toggle Public/Private** button per feedback item (controls visibility on `/:slug/reviews`)

### Messages (`/dashboard/messages`)

- Conversation threads tied to appointments
- Thread list with latest message preview
- Thread detail with full message history
- Send message input (1–2,000 characters)
- System messages for status changes

### Coupons (`/dashboard/coupons`)

- List of all coupons: code, type (Percent/Fixed), value, uses vs. max uses, expiry date, active status
- **Create Coupon** form: code (auto-uppercased), type, value (% or $), expiry date (optional), max uses (optional, null = unlimited), applicable services (optional, empty = all)
- Toggle active/inactive per coupon
- Edit and delete coupons

### Exports (`/dashboard/exports`)

- **Generate Export**: Select type (Clients, Appointments, Transactions) with optional date range
- Recent export jobs with status: Pending, Processing, Completed, Failed
- **Download** button for completed exports (CSV format)
- Export contents:
  - Clients: Name, Email, Phone, First Visit Date
  - Appointments: Date, Service, Client, Status, Total
  - Transactions: Date, Service, Amount, Type, Status, Method

### Profile (`/dashboard/profile`)

- **Business Info**: Business name, bio, location address, Instagram URL, TikTok URL
- **Payment Methods**: Toggle switches for Card, Apple Pay, Google Pay, Cash App Pay, Cash
- **Policies**: Cancellation hours (how far in advance clients must cancel), arrival grace minutes
- **Booking Controls**:
  - Books Open/Closed toggle (immediate effect)
  - Scheduled Opening: date and time picker for auto-opening books
  - Booking Window: preset buttons (1 Week, 2 Weeks, 1 Month, 3 Months, 1 Year) controlling how far ahead clients can book

---

## Communication System

All notifications use customizable templates with `{{variable}}` substitution. Providers can edit email subject, email body, and SMS body for each template type. A live preview renders sample data.

### Template Types

| Type | Trigger | Channels | Key Variables |
|------|---------|----------|---------------|
| Booking Confirmation | Client completes booking | Email + SMS | clientName, serviceName, dateTime, totalPrice, depositAmount, calendarUrl |
| Booking Notification | New booking received | Email | clientName, serviceName, dateTime, totalPrice, clientEmail, clientPhone |
| Cancellation | Appointment cancelled | Email + SMS | clientName, serviceName, dateTime, cancelledBy |
| Completion | Appointment marked complete | Email | clientName, serviceName, dateTime, totalPrice, depositAmount, feedbackUrl, balanceSection |
| Reminder | 24h and 2h before appointment | Email | clientName, serviceName, dateTime, providerName, locationAddress |
| Follow-up | 2h after completion | Email | clientName, serviceName, providerName, bookingUrl |
| Waitlist Available | Slot opens up | Email + SMS | clientName, serviceName, targetDate, bookingUrl |
| Waitlist Joined | Client joins waitlist | Email + SMS | clientName, serviceName, targetDate, timePreference |
| Balance Request | Provider sends payment link | Email + SMS | clientName, serviceName, totalPrice, depositAmount, remainingBalance, paymentUrl |

### Email

- Sent via Resend API
- Styled HTML wrapper with warm, branded template
- Google Calendar link generation for confirmations
- Graceful fallback: logs to console when Resend API key not configured

### SMS

- Sent via Twilio API
- Template-based with variable substitution
- Graceful fallback: logs to console when Twilio credentials not configured

---

## Payments

### Payment Methods

- Card (Stripe Checkout)
- Apple Pay (via Stripe)
- Google Pay (via Stripe)
- Cash App Pay (via Stripe)
- Cash (no online payment — confirmed immediately)

### Payment Types

| Type | When | Description |
|------|------|-------------|
| Deposit | At booking | Flat amount or percentage of service price |
| Full | At booking | Entire service price when no deposit is configured |
| Balance | After completion | Remaining amount (total - deposit - prior balance payments) |
| Refund | On cancellation | Tracked in system (manual processing) |

### Deposit Configuration

- **None**: No upfront payment required
- **Flat**: Fixed dollar amount (e.g., $25 deposit)
- **Percent**: Percentage of service price (e.g., 50% deposit)

### Stripe Integration

- Checkout Sessions with metadata for appointment and payment type tracking
- Webhook-driven confirmation: `checkout.session.completed` updates appointment status and creates payment records
- Expired session handling: `checkout.session.expired` logs event and notifies waitlist
- Idempotent webhook processing via event ID deduplication
- Separate checkout flows for deposits, full payments, and balance collection

---

## Scheduling & Availability

### Weekly Rules

- Per day-of-week schedule (Monday–Sunday)
- Start time and end time per day
- Toggle days on/off
- Bulk save (delete all + recreate in transaction)

### Time Slots

- 15-minute increments generated from availability rules
- Slots excluded if: rule inactive, within a time-off block, overlapping a confirmed appointment
- Timezone-aware: provider's wall-clock times converted to UTC via `wallClockToUTC()`

### Time-Off

- Date range blocks with optional reason text
- Automatically excluded from slot generation
- Cache invalidated on create/delete

### Booking Window

- Provider sets how far ahead clients can book (1 week to 1 year, default 30 days)
- Enforced in both the date picker UI and the booking API

### Books Open/Close

- Immediate toggle: books open or closed right now
- Scheduled opening: set a future date/time for books to auto-open
- Live countdown timer on public profile when scheduled opening is set
- Booking API rejects requests when books are closed

### Caching

- Redis cache with 300-second TTL per provider + date combination
- Invalidated on: appointment creation, appointment status change, availability rule update, time-off create/delete
- Graceful fallback to live database query when Redis is not configured

---

## Waitlist

### Client-Facing

- Join waitlist when no slots are available for a date
- Can target a specific time slot or a general time preference (Morning, Afternoon, Evening, Any)
- Confirmation email and SMS on join
- One entry per client per date per time slot (upsert on duplicate)

### Provider-Facing

- View all entries with status filtering
- Approve entries to mark slots as available
- Automatic notifications when slots free up (from cancellations or availability changes)

### Status Flow

```
ACTIVE → AVAILABLE (slot opens) → NOTIFIED (email sent) → BOOKED (client books)
ACTIVE → EXPIRED (date passes)
ACTIVE → CANCELLED (client or provider cancels)
```

### Notification Rules

- 4-hour cooldown between notifications to the same entry
- Triggered by: appointment cancellation, availability rule changes
- Email and SMS sent in parallel

---

## Coupons & Discounts

- **Percent discount**: Percentage off total (capped at 100%)
- **Fixed discount**: Dollar amount off total
- **Service restrictions**: Optional — limit coupon to specific services
- **Expiry date**: Optional — coupon invalid after date
- **Usage limit**: Optional — maximum total uses (null = unlimited)
- **Usage tracking**: Incremented on successful booking
- **Real-time validation**: Public endpoint for instant coupon checking during booking
- **Active/inactive toggle**: Provider can disable without deleting

---

## Feedback & Reviews

### Anonymous Feedback

- Submitted after appointment completion via public URL (no login required)
- Optional 1–5 star rating
- Required text body (1–2,000 characters)
- One submission per appointment
- Feedback URL included in completion email

### Review Management

- Provider sees all feedback on dashboard with filter tabs (All/Public/Private)
- Toggle individual feedback items between public and private
- Public feedback appears on `/:slug/reviews`

### Public Reviews

- Aggregate statistics: average rating and total count
- Reviews listed with: rating stars, text, service name, appointment date
- Summary section on provider profile page (only shown when reviews exist)

---

## CSV Exports

- **Three export types**: Clients, Appointments, Transactions
- **Date range filtering**: Optional start and end dates
- **Async processing**: Export jobs created as pending, processed in background
- **Status tracking**: Pending, Processing, Completed, Failed
- **Download**: CSV content stored in database, downloadable when complete
- **Export contents**:
  - Clients: Name, Email, Phone, First Visit Date
  - Appointments: Date, Service, Client Name, Status, Total Amount
  - Transactions: Date, Service, Amount, Payment Type, Status, Payment Method

---

## Security & Rate Limiting

### Authentication

- Clerk-based authentication for all protected endpoints
- Role-based access: PROVIDER for dashboard, no special role for CLIENT
- Ownership verification: providers can only access their own data

### Rate Limiting

- **Standard**: 100 requests/minute for general public endpoints
- **Strict**: 10 requests/minute for sensitive endpoints (booking, feedback, waitlist join, coupon validation)
- IP-based sliding window via Upstash Redis (falls back to in-memory store)

### Input Validation

- Zod schema validation on all request bodies
- Email normalization (lowercase, trimmed)
- Coupon codes auto-uppercased and trimmed
- Price amounts validated as positive integers (cents)
- Duration validated between 15–480 minutes

### Payment Security

- Stripe webhook signature verification
- Idempotent event processing (duplicate event detection)
- Amount validation (minimum 1 cent for card payments)
- Payment method validation against provider's accepted methods

---

## Background Jobs (Worker)

- **Appointment Reminders**: Sent at 24 hours and 2 hours before appointment start time; checks that appointment is still CONFIRMED before sending
- **Follow-up Emails**: Sent 2 hours after appointment completion with rebooking prompt
- **CSV Export Processing**: Generates export data asynchronously for large datasets
- **Draft Cleanup**: Runs every 15 minutes to remove abandoned DRAFT appointments

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#F8F6F1` | Warm linen page background |
| Surface | `#FFFFFF` | Cards, modals, panels |
| Surface Alt | `#F3EDE6` | Alternating sections, sidebar, hover |
| Border | `#E5DFD6` | Warm sand dividers, card borders |
| Primary | `#7B8B6A` | Warm sage CTA buttons, active indicators |
| Primary Hover | `#667A55` | Deep sage hover state |
| Primary Light | `#E6EBE1` | Sage tint backgrounds |
| Accent | `#C4A08A` | Rose gold highlights |
| Accent Light | `#F0E6DD` | Rose mist backgrounds |
| Text Primary | `#2A2522` | Rich charcoal headings |
| Text Secondary | `#6D6560` | Body text |
| Text Muted | `#9E958C` | Taupe captions, placeholders |

### Status Colors (Design Token System)

| Status | Style |
|--------|-------|
| Confirmed / Completed (payment) | `bg-status-success/10 text-status-success` (`#6B8F5C`) |
| Pending Payment / Pending | `bg-status-warning/10 text-status-warning` (`#C9993A`) |
| Completed (appointment) | `bg-status-info/10 text-status-info` (`#7A94AA`) |
| Cancelled / Failed | `bg-status-error/10 text-status-error` (`#BF6B6B`) |
| No-Show / Refunded | `bg-border/50 text-text-muted` |

### Typography

- **Playfair Display** (`font-display`): Page headings, prices, KPI amounts, provider names, Porobook wordmark
- **Inter** (`font-sans`): Body text, buttons, UI labels, captions

### Layout Principles

- "Quiet Luxury" aesthetic -- warm, calm, self-care-focused
- 8pt spacing grid (`grid-1` through `grid-6`)
- Border-based card elevation (`border border-border/50`) with `hover:shadow-soft` lift
- `skeleton-shimmer` gradient loading states (never `animate-pulse`)
- `animate-fade-in-up` page entrance animations
- `border-b-2 border-primary` underline nav active state (not filled pills)
- 6px dot indicators instead of number badges
- Portfolio-first layout (images before text)
- One primary action per screen
- Money visibility at every step
- Mobile-first, one-handed usability

---

## Explore / Discovery (`/explore`)

- Interactive Leaflet map with provider markers (OpenStreetMap tiles)
- Category filter chips: Nails, Hair, Esthetics, Brows & Lashes, Massage, Other
- "Use my location" toggle with browser geolocation API
- Radius selector: 5, 10, 25, 50, 100 miles
- Provider search API (`GET /api/providers/search`) with haversine distance calculation and bounding box pre-filter
- Provider cards showing: thumbnail, business name, category badge, star rating, distance, service count, books-open status, verified badge
- Click card to highlight marker on map; click marker for popup with "View Profile" and Google Maps directions
- Split layout: map on left (sticky on desktop), scrollable provider list on right
- Rate limited (60 req/min)

---

## Tipping (`/:slug/tip/:appointmentId`)

- Post-appointment tipping for COMPLETED appointments only
- Preset amounts: $5, $10, $15, $20 + custom amount input
- Stripe Checkout for tip payment
- Duplicate tip guard (prevents double-tipping)
- Tip URL auto-included in completion email
- Dashboard money page shows TIP payment type
- Webhook handler for `checkout.session.completed` with TIP type

---

## Dashboard Calendar (`/dashboard/calendar`)

- Full week-view grid with hourly time slots
- Mini calendar sidebar for date navigation
- Appointments displayed as colored blocks on the grid
- "Block Time" modal for creating time-off directly from calendar
- Time-off periods shown as blocked-out regions
- Forward/backward week navigation

---

## Avatar Upload

- Provider avatar upload with crop modal (`AvatarCropModal` component)
- Presigned R2 upload via `POST /api/providers/me/avatar`
- 5MB max file size, JPEG/PNG/WebP only
- Crop interface before upload

---

## Error Tracking (Sentry)

- Client-side error tracking (`sentry.client.config.ts`)
- Server-side error tracking (`sentry.server.config.ts`)
- Edge runtime error tracking (`sentry.edge.config.ts`)
- `onRequestError` instrumentation hook captures all unhandled API errors with route context
- `error.tsx` and `global-error.tsx` error boundaries with `Sentry.captureException`
- Source map upload via `withSentryConfig` in `next.config.js`
- 10% trace sample rate (configurable)
- Gracefully disabled when `NEXT_PUBLIC_SENTRY_DSN` is not set

---

## Health Check (`/api/health`)

- Database connectivity check (`SELECT 1`)
- Returns `{ status: "ok" | "degraded", timestamp, checks: { database: "ok" | "error" } }`
- Returns 200 for ok, 503 for degraded

---

## Legal Pages

- **Privacy Policy** (`/privacy`) — data collection, payment processing, data sharing, retention, rights, security
- **Terms of Service** (`/terms`) — service description, booking/payments, provider/client responsibilities, liability, dispute resolution
- Footer links on all pages

---

## Mobile App (Expo — In Progress)

### Provider Tabs

- Today: upcoming appointments
- Calendar: calendar view of schedule
- Clients: client roster
- Money: earnings overview
- Profile: settings and account

### Client Tabs

- Feed: discovery feed of providers
- Search: provider search with filters
- Bookings: appointment history
- Messages: in-app messaging
- Profile: account settings

### Integrations

- Clerk authentication with secure token storage
- Stripe React Native for in-app payments
- Push notifications via Expo Notifications
- Native share sheet for booking links
- Camera/gallery access for portfolio uploads

---

## Infrastructure

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Monorepo | pnpm 9.15 + Turborepo | Build orchestration |
| Web | Next.js 15.5, React 19, TypeScript 5.7 | Public pages + dashboard |
| Mobile | Expo 52, React Native 0.76, React 18 | Native app |
| Worker | Node.js + BullMQ | Background job processing |
| Database | PostgreSQL (Neon) + Prisma 6 | All persistent data |
| Cache | Upstash Redis | Availability slots (optional, graceful fallback) |
| Auth | Clerk | User management and sessions |
| Payments | Stripe | Checkout, webhooks, transfers |
| Email | Resend | Transactional email delivery |
| SMS | Twilio | Text message notifications |
| Storage | Cloudflare R2 (S3-compatible) | Portfolio media |
| Hosting | Vercel (web), Fly.io/Render (worker) | Deployment targets |

### Data Model

22 Prisma models: User, Provider, ProviderClient, Service, AddOn, AddOnGroup, Appointment, AppointmentEvent, Payment, Payout, AvailabilityRule, TimeOff, WaitlistEntry, Thread, Message, MessageTemplate, Feedback, MediaAsset, Coupon, ExportJob, FavoriteProvider, AccountActivityEvent

### API Surface

41 RESTful endpoints across 12 domains: Appointments (7), Availability (5), Services (8), Providers (3), Payments (2), Clients (3), Coupons (5), Feedback (4), Messages (2), Media (4), Waitlist (4), Exports (3), Webhooks (1)
