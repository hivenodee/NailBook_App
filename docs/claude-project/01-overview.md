# PoroBook — Project Overview

**Read this first. Everything else expands on what's here.**

---

## What PoroBook is

PoroBook is a **mobile-first booking and payments platform built specifically for Black beauty professionals** — nail techs, hair stylists, lash and brow artists, estheticians, massage therapists. Clients book and pay through a provider's shareable link in under 60 seconds, no app install required.

It's not a generic scheduling tool. It's positioned as the editorial-grade Resy / Pat McGrath of the beauty-pro world — luxury salon aesthetic instead of utility SaaS.

The one-liner:
> **Where Black Beauty Gets Booked.**

## Why it exists

The current state of beauty-pro booking is broken:
- Most independent Black beauty pros take bookings via **Instagram DMs**, which means missed messages, no deposit safety net, no calendar sync, no automated reminders, no client history.
- Existing platforms (Square Appointments, Acuity, Vagaro, GlossGenius, StyleSeat) feel like CRM tools designed for hair-salon chains, not for individual artists with editorial portfolios.
- None of them treat Black beauty professionals as the primary audience. Branding, photography, and copy in those platforms is generic-white-default by reflex.

PoroBook is the platform built **for** that audience, with the visual register the work deserves.

## Who it's for

### Primary persona — the provider
- Black female beauty professional, 25–45
- Independent (not a chain employee)
- Currently books via Instagram DM, Square, Acuity, GlossGenius, or Vagaro
- Books 5–25 appointments per week
- Has an Instagram following from a few hundred to tens of thousands
- Wants: editorial portfolio presentation, deposit protection, automated reminders, easy share link, payment certainty
- Doesn't want: utility SaaS aesthetic, white-default stock imagery, complex multi-staff scheduling

### Secondary persona — the client
- Visits a provider's link from Instagram / TikTok bio
- Wants to book in <60 seconds without creating an account or installing an app
- Will pay a deposit if it's clearly disclosed and the booking experience feels trustworthy
- Comes back to rebook the same provider repeatedly

## Core principles (non-negotiable)

1. **Mobile-first.** Public booking flow must work flawlessly on a phone via a shared link.
2. **Public booking does NOT require app install.** Web flow is the primary client surface.
3. **No forced signup for clients** to book.
4. **Clear money visibility at every step.** Deposits, refunds, payouts all show their status with no ambiguity.
5. **Provider-first control.** Providers choose payment methods, deposit rules, cancellation policy.
6. **Minimal, calm UI.** Editorial register — cream + rust + ink palette, Playfair Display + Inter, no neons, no gradients, no bro-tech dashboards.
7. **Human escalation for money/security issues.** Disputes, fraud, account access — always reachable.
8. **No silent data deletion.** Appointments and payments are append-only. Status changes via event sourcing.

## Current status (2026-05-27)

The product is **engineering-complete for V1 except provider onboarding**:

- ✅ Public booking flow (web) — deposit, intake questions, recurring, waitlist, manage/reschedule, balance pay, tip, feedback
- ✅ Provider dashboard — today view, calendar, services, hours, portfolio, money, feedback, waitlist, coupons, messages, templates, exports, reminders, profile
- ✅ Design system rebuild — cream/rust/ink palette, Playfair + Inter typography, motion, mobile-responsive audit done
- ✅ Stripe integration (test mode), Resend email, Twilio SMS, R2 image storage, Sentry monitoring
- ✅ CSP, rate limiting (with Redis), event sourcing on appointments, webhook idempotency
- ✅ All P0/P1 issues from earlier audits resolved
- ❌ **Provider onboarding wizard** — the single biggest blocker for real beta users (no UX flow for a new provider to sign up → finish profile → start accepting bookings)
- ❌ Stripe Connect (planned for post-beta or 5+ providers)
- ❌ Production deployment (still localhost)

The launch playbook (`docs/launch-playbook.md`) tracks the path from here to first paying beta provider.

## Tech stack summary

- **Web**: Next.js 15.5, React 19, Tailwind CSS, Prisma 6, PostgreSQL (Neon), Clerk auth, Stripe payments
- **Mobile**: Expo 52 (stubbed, V1 deferred — web flow is the V1 client surface)
- **Worker**: BullMQ on Redis (background reminders, follow-ups, exports)
- **Infrastructure (current)**: localhost dev, Neon DB, Cloudflare R2 storage, Resend email, Twilio SMS, Upstash Redis (prod cache)
- **Infrastructure (planned)**: Vercel (web), Railway (worker), custom domain `porobook.com`

See `04-infrastructure.md` for details.

## File index

| File | What's in it |
|---|---|
| **01-overview.md** | This file. Mission, audience, principles, current status. |
| **02-product-spec.md** | Every feature in detail: provider features, client features, deferred items |
| **03-marketing.md** | Positioning, competitor landscape, brand voice, channels, growth plan |
| **04-infrastructure.md** | Current dev setup + planned production stack, env vars, deploy plan |
| **05-design-system.md** | Brand register, palette, typography, motion, component conventions |
| **06-decisions-and-open-questions.md** | Decisions already made (with rationale) + open questions still on the table |

## How to use this with Claude

When asking Claude for help with PoroBook:
- **Planning / strategy questions** → 01, 03, 06
- **Feature development** → 02, 05
- **Infrastructure / deploy / debugging** → 04
- **Marketing / positioning / copy** → 03
- **UI design / brand work** → 05
- **Anything where you don't want to relitigate a settled decision** → 06
