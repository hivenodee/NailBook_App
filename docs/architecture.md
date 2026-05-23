# Porobook Architecture (MVP → Early Scale, Supabase Deferred)

Last updated: 2026-02-07
Owner: Justice Heughan

This document is the source of truth for Porobook’s system architecture.  
CLAUDE.md should reference this file and must not duplicate infrastructure decisions.

---

## High-Level Decision Summary

- Target scale: 20+ service providers at launch
- Infrastructure priority: speed, correctness, low operational overhead
- Supabase: intentionally deferred until further research
- Database approach: plain hosted Postgres + Prisma (portable by design)
- AWS: not required for MVP; revisit only with clear scale or compliance triggers

---

## Goals

- Support multi-tenant booking for at least 20 providers from day one
- Fast, high-conversion public booking flow (social traffic friendly)
- Clean mobile experience for providers and clients
- Strong money clarity (deposits, payouts, refunds, cash)
- Immutable logs (appointments, payments, account activity)
- Architecture that scales without rewrite

Non-goals (MVP):
- Kubernetes, ECS, or complex AWS networking
- Microservice sprawl
- Realtime chat guarantees
- Enterprise compliance posture

---

## System Overview

Client surfaces
- Mobile app (providers + clients): Expo / React Native
- Public booking web: Next.js (App Router)

Backend
- API layer: Next.js API routes (MVP)
- Background worker: reminders, exports, follow-ups, cleanup

Data
- Postgres (primary system of record)
- Redis (cache, rate limits, queues)
- Object storage (media)

External services
- Auth: Clerk
- Payments: Stripe
- Email: Resend
- SMS: Twilio
- Observability: Sentry

---

## Hosting & Services (MVP)

Web
- Vercel (Next.js)

Database
- Hosted Postgres (current choice: Neon)
- Prisma ORM
- No platform-specific DB features assumed

Redis
- Upstash Redis

Object Storage
- Cloudflare R2 (S3-compatible)

Worker & Cron
- Fly.io or Render
- Dedicated process for background jobs

Observability
- Sentry (web, API, mobile)
- Structured JSON logs

---

## Environments

Environments
- local
- staging
- production

Rules
- staging mirrors production architecture
- separate databases and storage per environment
- secrets managed via platform secret stores
- migrations applied in a controlled step

---

## Tech Stack

Frontend
- Expo (React Native)
- Next.js (App Router)
- TypeScript
- Tailwind (web)
- react-hook-form + zod

Backend
- Node.js
- Prisma ORM
- zod for validation
- RESTful APIs (clear resource naming)

Payments
- Stripe Checkout or Payment Intents (choose once)
- Webhooks finalize booking state

Notifications
- Push: Expo Notifications
- Email: Resend
- SMS: Twilio

---

## Multi-Tenancy Model

Tenant = Provider (salon or independent tech)

Rules
- All provider-scoped tables include providerId
- All reads/writes scoped by providerId
- No cross-provider queries
- Unique constraints enforced per provider where applicable

Security model
- Enforcement primarily in service layer
- Database constraints backstop logic
- RLS intentionally deferred

---

## Core Domain Concepts

- Provider
- Client
- Service
- Appointment
- Payment ledger
- Activity log
- Messaging threads
- Media assets

---

## Minimum Data Model

Users & Tenancy
- User
- Provider
- ProviderMember (optional, future)

Catalog
- Service
- AddOn (optional)

Scheduling
- AvailabilityRule
- TimeOff
- Appointment

Messaging
- Thread
- Message

Payments
- Payment
- Payout

Logs
- AppointmentEvent (immutable)
- AccountActivityEvent (immutable)

Media
- MediaAsset

Exports
- ExportJob

---

## Appointment Lifecycle

Statuses
- DRAFT
- PENDING_PAYMENT
- CONFIRMED
- COMPLETED
- CANCELLED
- NO_SHOW (optional)

Rules
- No hard deletes
- Every state change writes an AppointmentEvent
- Reschedules update times but preserve appointment ID
- Cancellations record actor + timestamp

---

## Payments & Money Visibility

Payment types
- Stripe (card / Apple Pay / Google Pay)
- Cash (tracked internally only)

Ledger rules
- Every payment mutation creates:
  - a Payment record
  - an AppointmentEvent
- Provider dashboards derive totals from DB records, not Stripe APIs

Stripe flow
1) Create appointment (DRAFT or PENDING_PAYMENT)
2) Create Stripe session
3) Client completes payment
4) Webhook verifies success
5) Appointment marked CONFIRMED
6) Events written atomically

Webhook handling
- Idempotent by Stripe event ID
- Explicit handling for success, failure, refunds, disputes

---

## Availability & Slot Calculation

Source of truth
- AvailabilityRule
- TimeOff
- Existing CONFIRMED appointments

Approach
- Compute slots on demand
- Cache per provider/day in Redis (30–120s)
- Invalidate cache on booking changes

Concurrency protection
- Confirm bookings inside DB transaction
- Prevent overlapping confirmed appointments

---

## Messaging

MVP
- Stored in Postgres
- Notification-based delivery
- No realtime guarantees

Phase 2
- Managed realtime provider or WebSockets

---

## Notifications

Triggers
- Booking confirmed
- 24h reminder
- 2h reminder
- Post-appointment review prompt

Implementation
- Jobs scheduled at booking confirmation
- Cancelled/rescheduled appointments invalidate jobs

---

## Background Jobs

Worker responsibilities
- Appointment reminders
- Follow-ups
- CSV exports
- Cleanup of expired drafts (mark expired, never delete)

Scheduling
- Platform cron triggers job runner
- Redis-backed queue

---

## Media Uploads

- Signed uploads to R2
- Store MediaAsset metadata in DB
- Enforce size/type limits
- Image thumbnails generated client-side or via worker

---

## Observability

Required
- Sentry for errors
- Request-scoped structured logs
- Stripe webhook logging

---

## Security

- Auth required for all non-public endpoints
- Public booking APIs rate-limited
- Strict input validation
- No card data stored
- Webhook signature verification
- Principle of least privilege on storage keys

---

## CI/CD & Migrations

Deployments
- Vercel for web/API
- Fly.io or Render for worker

Migrations
- Prisma migrations
- Applied once per environment via controlled process

Rollback
- Backwards-compatible migrations when possible
- Feature flags for risky changes

---

## Configuration & Secrets

Key env vars
- DATABASE_URL
- REDIS_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- CLERK_SECRET_KEY
- NEXT_PUBLIC_* equivalents
- STORAGE credentials
- SENTRY_DSN

---

## Scaling Notes

20 providers
- Current architecture is more than sufficient

200+ providers
- Increase caching
- Split API into dedicated service if needed
- Optimize event tables

2,000+ providers
- Evaluate AWS (RDS, SQS, ECS)
- Partition large event tables
- Advanced monitoring

---

## Invariants (Must Never Break)

- No silent deletion of appointments or payments
- Every appointment change writes an event
- Payment state changes are logged
- All provider data scoped by providerId
- Webhooks are idempotent

---

## Decisions Log

- 2026-02-07: Deferred Supabase pending further research
- 2026-02-07: Selected hosted Postgres (Neon) + Prisma for MVP
- 2026-02-07: Chose managed MVP infra over AWS-first
