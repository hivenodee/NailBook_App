# NailBook

A mobile-first nail booking and payments platform with a public booking web flow optimized for social traffic. Providers operate from the mobile app; clients book instantly through a shareable link without installing anything.

## Overview

NailBook is a monorepo containing three applications and three shared packages, built for independent nail technicians who need a professional booking system they can share from their Instagram or TikTok bio.

**Core idea:** A nail tech creates their profile, sets up services and availability, then shares a single link. Clients tap it, pick a service, choose a time, pay their deposit, and they're booked -- all in under 90 seconds, no app required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | pnpm 9.15 + Turborepo |
| **Web App** | Next.js 15.5, React 19, TypeScript 5.7 |
| **Mobile App** | Expo 52, React Native 0.76, React 18 |
| **Background Jobs** | Node.js + BullMQ |
| **Database** | PostgreSQL (Neon) + Prisma 6 |
| **Cache** | Upstash Redis (optional, graceful fallback) |
| **Auth** | Clerk |
| **Payments** | Stripe (deposits, full payments, balance collection) |
| **Email** | Resend |
| **SMS** | Twilio |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Hosting** | Vercel (web), Fly.io/Render (worker) |

## Repository Structure

```
nailbook/
├── apps/
│   ├── web/          # Next.js 15 — public booking + provider dashboard
│   ├── mobile/       # Expo 52 — provider + client native app
│   └── worker/       # BullMQ — background jobs (reminders, exports, cleanup)
├── packages/
│   ├── db/           # Prisma schema, client, migrations
│   ├── shared/       # Zod validators, TypeScript types, constants
│   └── config/       # Shared tsconfig + ESLint configs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Features

### Public Booking Flow (Web)

The booking flow is the core product surface -- optimized for mobile browsers, accessible from any social bio link.

- **Provider profile page** (`/:slug`) -- portfolio grid, services, reviews, policies, payment methods
- **3-step booking** (`/:slug/book`) -- select time, enter details, review & pay
- **Stripe checkout** for card/Apple Pay/Google Pay/Cash App Pay deposits
- **Cash booking** support (no deposit required)
- **Add-on selection** with group rules (optional, exactly one, at least one)
- **Coupon codes** (percent or fixed discount, service-scoped, usage-limited)
- **Confirmation polling** -- real-time status after Stripe redirect
- **Per-slot waitlist** -- clients can join waitlist for booked time slots
- **Day-level waitlist** -- join waitlist for a fully booked date with time preference
- **Books open/close** -- providers control when booking is available, with scheduled auto-open and live countdown
- **Booking window** -- configurable how far ahead clients can book (1 week to 1 year)
- **Remaining balance collection** -- post-appointment payment page (`/:slug/pay/:id`)
- **Anonymous feedback** -- post-appointment form (`/:slug/feedback/:id`), no auth required
- **Public reviews** (`/:slug/reviews`) -- aggregate ratings from opted-in feedback

### Provider Dashboard (Web)

The dashboard gives providers full control over their business from a browser.

- **Today view** -- upcoming appointments with status badges, grouped by date
- **Appointment detail** -- full client info, service breakdown, payment history, activity log, status actions (complete, cancel, no-show), balance collection (send payment link or mark cash)
- **History** -- all past appointments with status filtering
- **Services** -- create/edit services with pricing, duration, deposit settings (none/flat/percent); manage add-ons and add-on groups with selection rules
- **Availability** -- weekly hour rules, time-off blocks, timezone-aware scheduling
- **Clients** -- searchable directory with visit counts, notes, appointment history
- **Money** -- revenue analytics with configurable time range and granularity (daily/weekly/monthly/yearly), KPI cards (revenue, lost, recovered, net), line chart visualization, paginated transaction ledger with status filtering
- **Portfolio** -- upload photos/videos to R2, reorder, hide/show assets
- **Waitlist** -- manage active/available/notified entries, approve slots, auto-expire past entries
- **Feedback** -- view all feedback, toggle public/private visibility for reviews
- **Messages** -- customizable email/SMS templates for 9 event types with variable substitution and live preview
- **Coupons** -- create discount codes (percent/fixed), scope to services, set expiry and usage limits
- **Exports** -- generate CSV downloads for appointments, clients, or transactions with date filtering
- **Profile** -- business info, social links, payment method toggles, booking controls, cancellation/arrival policies

### Mobile App (Expo)

The native app serves both providers and clients with role-based tab navigation.

**Provider tabs:** Today, Calendar, Clients, Money, Profile
**Client tabs:** Feed, Search, Bookings, Messages, Profile

- Clerk authentication with secure token storage
- Stripe React Native for in-app payments
- Push notifications via Expo Notifications
- Share booking link via native share sheet
- Portfolio uploads from camera or gallery

### Background Worker

BullMQ-based job processor running on a separate service.

- **Appointment reminders** -- configurable hours before (24h, 2h)
- **Post-appointment follow-ups** -- rebooking prompts
- **CSV export generation** -- async processing for large datasets
- **Draft cleanup** -- removes abandoned draft appointments every 15 minutes

### Communication System

All notifications use customizable templates with `{{variable}}` substitution.

**9 template types:**
| Type | Trigger |
|------|---------|
| Booking Confirmation | Client books appointment |
| Booking Notification | Provider receives new booking |
| Cancellation | Appointment cancelled |
| Completion | Appointment marked complete |
| Reminder | Before appointment (24h, 2h) |
| Follow-up | After completed appointment |
| Waitlist Available | Slot opens up |
| Waitlist Joined | Client joins waitlist |
| Balance Request | Remaining balance payment link sent |

Each template supports email (subject + body) and SMS (body), with provider-customizable content and fallback defaults.

### Payments

- **Deposit types:** None, flat amount, percentage of service price
- **Payment methods:** Card, Apple Pay, Google Pay, Cash App Pay, Cash
- **Payment types:** Deposit, Full, Balance, Refund
- **Balance collection:** After appointment, provider can send Stripe payment link or mark cash received
- **Webhook-driven:** All payment confirmations flow through Stripe webhooks
- **Idempotent:** Webhook processing checks for duplicate events

### Availability & Scheduling

- **Weekly rules** per day of week with start/end times
- **Time-off blocks** with date ranges
- **Timezone-aware** -- wall-clock times stored in provider's timezone, converted to UTC for queries
- **15-minute slot increments** with conflict checking against confirmed appointments
- **Redis-cached** with 5-minute TTL, invalidated on booking/cancellation/rule changes
- **Waitlist notifications** -- automatic when slots free up from cancellations

## Data Model

22 Prisma models covering the full booking lifecycle:

**Core:** User, Provider, ProviderClient, Service, AddOn, AddOnGroup
**Booking:** Appointment, AppointmentEvent, Payment, Payout
**Scheduling:** AvailabilityRule, TimeOff, WaitlistEntry
**Communication:** Thread, Message, MessageTemplate, Feedback
**Content:** MediaAsset, Coupon, ExportJob
**Account:** FavoriteProvider, AccountActivityEvent

**Key enums:**
- `AppointmentStatus`: DRAFT, PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
- `PaymentStatus`: PENDING, COMPLETED, FAILED, REFUNDED
- `PaymentType`: DEPOSIT, FULL, BALANCE, REFUND
- `PaymentMethod`: CARD, APPLE_PAY, GOOGLE_PAY, CASH_APP_PAY, CASH
- `DepositType`: NONE, FLAT, PERCENT
- `WaitlistEntryStatus`: ACTIVE, AVAILABLE, NOTIFIED, BOOKED, EXPIRED, CANCELLED
- `GroupSelectionRule`: OPTIONAL, EXACTLY_ONE, AT_LEAST_ONE
- `MessageTemplateType`: 9 types (booking, cancellation, completion, reminder, followup, waitlist, balance)

## API

41 RESTful endpoints organized by domain. Authentication via Clerk; public endpoints rate-limited via Upstash.

### Appointments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/appointments` | Public (rate-limited) | Create booking with pricing, Stripe checkout, notifications |
| GET | `/api/appointments` | Provider | List by status |
| GET | `/api/appointments/:id` | Public | Appointment detail with events/payments |
| PATCH | `/api/appointments/:id` | Provider | Complete, cancel, no-show, reschedule |
| GET | `/api/appointments/:id/balance` | Public | Remaining balance info |
| POST | `/api/appointments/:id/balance/checkout` | Public (rate-limited) | Stripe checkout for balance |
| POST | `/api/appointments/:id/collect-balance` | Provider | Send payment link or mark cash |

### Availability
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/availability/:slug` | Public (cached) | Time slots for a date |
| GET/POST | `/api/availability/rules` | Provider | Weekly availability rules |
| GET/POST | `/api/availability/time-off` | Provider | Time-off blocks |
| DELETE | `/api/availability/time-off/:id` | Provider | Remove time-off |

### Services
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | Public | List provider's services |
| POST | `/api/services` | Provider | Create service |
| GET/PATCH | `/api/services/:id` | Mixed | Service detail / update |
| POST/PATCH/DELETE | `/api/services/:id/addons` | Provider | Add-on CRUD |
| POST/PATCH/DELETE | `/api/services/:id/addon-groups` | Provider | Add-on group CRUD |

### Providers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PATCH | `/api/providers/me` | Provider | Own profile |
| GET | `/api/providers/:id` | Public | Public profile |
| GET | `/api/providers/:slug/reviews` | Public | Public reviews + aggregate stats |

### Money & Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/payments` | Provider | Transaction ledger with pagination |
| GET | `/api/dashboard/analytics` | Provider | Revenue analytics with time buckets |

### Other Endpoints
| Domain | Methods | Description |
|--------|---------|-------------|
| Clients | GET, PATCH | Client directory + detail |
| Coupons | GET, POST, PATCH, validate | Coupon CRUD + public validation |
| Feedback | POST (public), GET, PATCH | Submit + manage feedback |
| Messages | GET, POST | In-app messaging |
| Message Templates | GET, PUT, preview | Customizable notification templates |
| Media | POST, PATCH, DELETE | Portfolio upload/manage |
| Waitlist | POST (public), GET, DELETE, approve | Waitlist CRUD |
| Exports | POST, GET, download | CSV export jobs |
| Webhooks | POST `/api/webhooks/stripe` | Stripe event handler |

## Design System

The UI follows a warm, calm aesthetic designed specifically for the self-care industry.

**Color tokens (Warm Earth palette):**
- Background: `#F8F6F1` (warm linen)
- Surface: `#FFFFFF`
- Surface Alt: `#F3EDE6` (alternating sections)
- Border: `#E5DFD6` (warm sand)
- Primary: `#7B8B6A` (warm sage)
- Primary Hover: `#667A55` (deep sage)
- Primary Light: `#E6EBE1` (sage tint)
- Accent: `#C4A08A` (rose gold)
- Accent Light: `#F0E6DD` (rose mist)
- Text Primary: `#2A2522` (rich charcoal)
- Text Secondary: `#6D6560`
- Text Muted: `#9E958C`
- Status: Success `#6B8F5C`, Warning `#C9993A`, Error `#BF6B6B`, Info `#7A94AA`

**Typography:** DM Serif Display for headings and prices, Inter for body text.

**Design principles:**
- "Quiet Luxury" aesthetic -- warm, calm, self-care-focused
- 8pt spacing grid (`grid-1` through `grid-6`)
- Border-based card elevation with `hover:shadow-soft`
- `skeleton-shimmer` gradient loading states (not pulse)
- `animate-fade-in-up` page entrance animations
- Portfolio-first layout (images before text)
- One primary action per screen
- Money visibility at every step
- Mobile-first, one-handed usability

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9.15+
- PostgreSQL database (or Neon account)

### Installation

```bash
git clone <repo-url>
cd nailbook
pnpm install
```

### Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

**Required variables:**
```env
DATABASE_URL=           # PostgreSQL connection string
NEXT_PUBLIC_APP_URL=    # Public app URL (e.g. http://localhost:3000)

# Auth (Clerk)
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Payments (Stripe)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
```

**Optional (graceful fallback when missing):**
```env
# Email
RESEND_API_KEY=
EMAIL_FROM=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Storage (Cloudflare R2)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Cache
REDIS_URL=
REDIS_TOKEN=
```

### Database Setup

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database (development)
# or
pnpm db:migrate     # Run migrations (production)
```

### Development

```bash
pnpm dev            # Start all apps via Turborepo
```

This starts:
- **Web app** at `http://localhost:3000`
- **Mobile app** via Expo dev server

### Database Management

```bash
pnpm db:studio      # Open Prisma Studio (visual DB editor)
pnpm db:migrate     # Create and run migrations
pnpm db:push        # Push schema changes (dev only)
```

### Build

```bash
pnpm build          # Build all apps
```

## Architecture Highlights

- **Multi-tenancy** -- all provider data scoped by `providerId`; no cross-provider queries
- **Webhook-driven payments** -- Stripe webhooks are the source of truth for payment status; idempotent processing
- **Event sourcing for appointments** -- every status change creates an `AppointmentEvent` with actor, type, and metadata
- **Lazy service initialization** -- Stripe, Redis, S3, email, and SMS clients use getter patterns to avoid build-time failures when env vars are missing
- **Graceful degradation** -- Redis cache, email, and SMS all fall back silently when not configured
- **Rate limiting** -- standard (60 req/min) and strict (10 req/min) tiers via Upstash; no-op without Redis
- **Timezone-aware scheduling** -- availability rules stored as wall-clock times, converted to UTC via `wallClockToUTC()` for database queries
- **Shared validation** -- Zod schemas in `@nailbook/shared` used by both web API routes and mobile app forms

## Deployment

### Web (Vercel)

The web app deploys to Vercel with the Next.js preset. Set all environment variables in the Vercel dashboard.

### Worker (Fly.io / Render)

The BullMQ worker runs as a separate Node.js process. It needs `DATABASE_URL`, `REDIS_URL`, and email/SMS credentials.

### Database (Neon)

Production uses Neon's serverless Postgres. Run migrations with:

```bash
pnpm db:migrate:deploy
```

## License

Private -- all rights reserved.
