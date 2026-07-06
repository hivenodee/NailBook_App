# PoroBook — Decisions & Open Questions

This file is the **memory of decisions already made** so Claude doesn't relitigate settled issues, and a list of **open questions** still on the table.

When asking for advice, scan here first — chances are it's already been thought through.

---

## Decided

### Product scope

- **V1 surface is web-only.** Mobile (Expo) is stubbed but deferred. The public booking flow on the web IS the V1 client experience. ✅
- **No client account required to book.** Guest checkout is the default. Account creation is offered post-booking, never required. ✅
- **Light mode only.** Dark mode was wired but never matched the editorial brand register (Aesop, PMG, Resy are all light-only). Toggle and dead CSS removed. Don't reintroduce dark mode. ✅
- **No Stripe Connect for first 3–5 providers.** Manual payouts via Venmo/Zelle are fine for friends-and-family beta. Stripe Connect Standard accounts ship later when the cohort grows. ✅
- **Manual verification for beta.** `isVerified` is admin-set via Prisma Studio until there are >20 providers. No self-serve verification UI for beta. ✅
- **Single domain for everything.** `porobook.com` serves marketing + provider profiles + booking flow + dashboard. No subdomain split. Matches Resy / OpenTable / Cal.com pattern. ✅

### Brand + design

- **Cream / Rust / Ink palette.** Defined in `lib/design-tokens.ts`. No deviations without revisiting brand strategy. ✅
- **Playfair Display + DM Sans typography pair.** Both self-hosted via `next/font`. ✅
- **Editorial-grade register, not utility SaaS.** References: Aesop, Pat McGrath, Mytopicals, Resy. Not: Material, Stripe gradients, generic shadcn, "girl boss" brands. ✅
- **No emoji as design.** No stock photography. All brand imagery is editorial photography of Black women, generated via Nano Banana 2 Pro and stored in `public/brand/`. ✅
- **Cover image pattern follows X/Twitter.** Full-bleed banner (2:1 mobile, 6:1 desktop) with avatar overlap on bottom-left of body content column. Text below the cover, not on top of it. ✅

### Engineering / architecture

- **No hard deletes.** Appointments and payments are append-only. Event-sourced status changes. ✅
- **All prices in cents (integer).** Float arithmetic is forbidden for money. ✅
- **Provider scoping on every query.** Multi-tenancy by `providerId` in WHERE clauses. ✅
- **Lazy service init.** Stripe / Redis / Resend / Twilio / S3 clients use getter patterns. No `new Client()` at module top. ✅
- **Webhook idempotency on Stripe.** Duplicate `event.id` is checked before processing. ✅
- **Rate limiting fallback is no-op (not block) when Redis is unavailable.** Justified for solo dev; documented as not-acceptable for production. Upstash Redis is required for prod env. ✅
- **API response envelope:** `{ data: T }` success / `{ error: { message: string } }` error. Every route. ✅
- **Brand assets committed to repo at `apps/web/public/brand/`.** 102MB of JPEGs accepted as repo bloat until 1k commits. Then revisit (git-lfs or CDN). ✅

### Legal / business

- **Umbrella LLC + DBA pattern.** Single LLC under an umbrella name (e.g. AI consulting business name or "[Founder] Ventures LLC"). PoroBook operates as a DBA / product line. Spin out into its own LLC when traction warrants. ✅
- **Trademark filing strategy:** USPTO Intent-to-Use, classes 042 (software services) + 035 (business services). $350/class DIY at uspto.gov, or ~$500 via service. ✅
- **No attorney review pre-beta.** Template TOS + privacy from a generator (Termly) with the 7 marketplace clauses present. Attorney review triggers when: 25+ providers, first paid dollar, expanding outside home state, or first complaint with the word "lawyer." ✅
- **No insurance for beta cohort.** General Liability + E&O ($500–1500/year) wait until ~50 providers. ✅

### Operations

- **Test mode Stripe + dev-tenant Clerk for beta development.** Switch to live keys only AFTER Phase D deploy is verified working end-to-end. ✅
- **Free for first 6 months of beta.** No monetization until product-market fit signals. Monetization model (flat sub vs take rate vs hybrid) decided then. ✅
- **Friends-and-family alpha (2–3 people) before friends-and-family beta (3–5).** Two distinct cohorts. ✅

---

## Open questions (with current leaning)

### Pricing model (when monetization starts)
- **Options:** flat $29–49/mo subscription, take rate 1.5–3%, hybrid
- **Current leaning:** flat $29/mo for first 12 months, undercut GlossGenius by 25%, simple to communicate
- **Trigger to decide:** 6 months after first paying beta cohort, OR when 25+ providers, whichever first

### Notifications page (`/dashboard/notifications`)
- **Status:** currently shows outbound delivery log only
- **Open:** should it be split into Inbox (provider-side activity feed) + Settings (notification preferences) tabs? Both tabs would need new schema (no `ProviderActivity` table; no `NotificationPreference` table).
- **Current leaning:** hide the page from main nav for beta. Decide post-beta when there's real usage signal.

### Provider `phone` field
- **Status:** schema has no `phone` on `Provider`. `User.phone` exists but isn't exposed.
- **Open:** add phone to Provider profile so clients can see it / call?
- **Current leaning:** defer. Email + Instagram DM cover the contact need for beta.

### Follow-up + rebook-nudge reminders
- **Status:** schema gap. `ReminderSetting.hoursBefore` (positive int) can't model "after appointment" timing.
- **Open:** add a `direction` field (before/after) + a `rebookWeeks` field?
- **Current leaning:** defer. 24h + 1h before are the high-value reminders. Follow-up + rebook are V2.

### Per-reminder message copy
- **Status:** `MessageTemplate` is provider-wide per type. Editing the 24h reminder template also changes what the 1h reminder uses.
- **Open:** add a per-`ReminderSetting` custom template?
- **Current leaning:** defer. Beta providers won't notice.

### Per-event-type notification preferences for providers
- **Status:** no schema for "do not email me about new bookings" granular prefs.
- **Open:** add a `NotificationPreference` table?
- **Current leaning:** defer. All providers want all notifications during beta.

### Neon idle disconnect on worker
- **Status:** worker crashes after extended idle ("Server has closed the connection")
- **Fix candidates:** Prisma `connection_limit` + retry wrapper, OR move to a long-running DB (vs Neon serverless), OR ping pattern
- **Current leaning:** ~15 minute Prisma client wrapper with retry-on-PrismaClientUnknownRequestError. Defer until repeat occurrences impact beta providers.

### Custom Clerk domain (`clerk.porobook.com`)
- **Status:** currently using Clerk's dev tenant (`*.accounts.dev`). For production: either generic `*.clerk.accounts.dev` (free) or custom `clerk.porobook.com` (requires Clerk Pro plan).
- **Open:** is the brand polish worth Clerk Pro pricing?
- **Current leaning:** start on generic prod subdomain. Upgrade to custom domain if branding feedback is loud enough.

### Stripe Connect onboarding (when to ship)
- **Status:** schema has `Provider.stripeAccountId` but no UI. For first 3–5 providers, manual payouts via Venmo are fine.
- **Trigger:** when there are 5+ active providers OR a single provider asks to be paid directly.
- **Current leaning:** Standard accounts (lightest integration, providers see Stripe-branded onboarding). Defer Express until Standard becomes a friction point.

### Cover photo on production R2 — public URL pattern
- **Status:** dev uses `pub-…r2.dev` (Cloudflare's auto-generated public dev URL).
- **Open:** for production, set up custom domain `media.porobook.com` pointing at R2?
- **Current leaning:** yes. Cleaner URLs in `<img src>` tags, looks more professional. Set up during Phase D.

### Provider portfolio video support
- **Status:** schema supports `type: VIDEO` but UI doesn't currently upload videos.
- **Open:** add video upload to portfolio?
- **Current leaning:** Phase G+ once we have signal from providers asking. Storage costs + transcoding are non-trivial.

### Mobile app revival (Expo)
- **Status:** stubbed in `apps/mobile/`. V1 deferred.
- **Trigger:** when 50+ providers are using the platform OR a provider explicitly says "I'd use this more if there were a phone app."
- **Current leaning:** native dashboard for providers first, then native client experience. Likely 2027.

---

## Anti-decisions (things explicitly NOT happening)

Things that have been considered and rejected for V1:

- **Two-way calendar sync** (Google Cal, iCal) — V2 only. Per `claude.md` guardrails.
- **Analytics dashboard** beyond the money page — V2 only.
- **Loyalty / rewards programs** — V2 only.
- **Gift cards** — V2 only.
- **Boosted listings / paid placement** — never. Pay-to-play in beauty has a bad smell.
- **Multi-currency support** — US only for now. Phase H+ for Canada / UK expansion.
- **Multi-language UI** — English only. Beauty audience is mostly US English-speaking.
- **Instant payouts** — V2 once we're on Stripe Connect.
- **Inventory / expense tracking** — never. Wrong scope. Providers can use QuickBooks for that.
- **Education marketplace** — never in this product. Spin-out maybe.
- **Cross-vertical scheduling** (lawyers, therapists, etc.) — never. PoroBook is for Black beauty pros, period.

---

## How to update this doc

When a new decision is made in conversation:
- If it's a settled product/brand/engineering call → add to "Decided" section with rationale
- If it's an open question that needs to be revisited later → add to "Open questions" with current leaning + trigger to decide
- If it's been explicitly ruled out → add to "Anti-decisions" with one-line reason

Date stamp isn't necessary — the file is overwritten as decisions evolve.
