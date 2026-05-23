# PoroBook Launch Playbook

**From today to first paying beta provider, step by step.**

How to use this doc:
- Each step is a checkbox. Tick it as you finish.
- Steps are roughly sequential. Some sections (D and E) can run in parallel once code is on GitHub.
- "🟢 do now" = can be done today without judgment calls. "🟡 needs input" = a call you have to make. "🔴 requires money / external review" = costs time or legal involvement.
- Time estimates assume you are working solo and have not done this before.

---

## Phase A — Code hygiene (1 evening)

You have ~70 modified files + 30 new files sitting uncommitted. Get them into GitHub before doing anything else.

- [ ] **A1. 🟢 Rotate the leaked Firecrawl API key.** Go to https://www.firecrawl.dev/, dashboard → API Keys → revoke `fc-51008528189c4bd69ddb570300d1904f`, generate a new one. Save the new key in your password manager. **Do not commit it.**
- [ ] **A2. 🟢 Add a `.gitignore` block** at the repo root for:
  ```
  .mcp.json
  .firecrawl/
  docs/design/
  packages/db/check-appts.mjs
  *.local
  .env
  .env.local
  ```
- [ ] **A3. 🟡 Decide what to do with `apps/web/public/brand/` (102MB of 4K JPEGs).** Three options:
  - (a) Commit them as-is — bloats the repo permanently but everything just works
  - (b) Use git-lfs — proper but adds setup overhead (`brew install git-lfs && git lfs install && git lfs track "*.jpeg"`)
  - (c) Move them to R2 or Cloudinary and reference via absolute URLs — cleanest long-term, requires updating MANIFEST + image refs
  - **Recommendation:** (a) for now, revisit at 1k commits.
- [ ] **A4. 🟡 Decide what to do with `docs/design/` (56MB screenshots).** Either gitignore it (above) or commit it as design history. **Recommendation:** gitignore. The current designs are the source of truth in code.
- [ ] **A5. 🟢 Stage and commit in logical chunks.** Suggested sequence:
  ```bash
  git add docs/ .claude/
  git commit -m "docs: design system + audit reports"

  git add packages/db/prisma/schema.prisma pnpm-lock.yaml
  git commit -m "schema: add coverImageUrl, isVerified, balance + reminder fields"

  git add apps/web/src/lib/ apps/web/src/components/ui/ apps/web/src/components/layout/
  git commit -m "ui: design system primitives + ErrorBanner + PageTransition"

  git add apps/web/src/components/booking/ apps/web/src/components/calendar/ \
          apps/web/src/components/ServiceList.tsx apps/web/src/components/PortfolioGrid.tsx \
          apps/web/src/components/AvatarCropModal.tsx apps/web/src/components/ExploreMap.tsx
  git commit -m "ui: booking flow + calendar + portfolio components"

  git add apps/web/src/app/
  git commit -m "ui: page redesigns + per-route metadata + favicons"

  git add apps/web/src/middleware.ts apps/web/next.config.js apps/web/tailwind.config.ts \
          apps/web/src/styles/ apps/web/.env.local.example
  git commit -m "config: tailwind tokens + CSP + middleware"

  git add apps/web/src/app/api/
  git commit -m "api: cover upload, reminder stats, threads endpoint, status fixes"
  ```
- [ ] **A6. 🟢 Push to GitHub:** `git push origin main`
- [ ] **A7. 🟢 Verify GitHub** — open the repo in browser, confirm `.mcp.json` and `.env.local` are absent.

**Done with Phase A when:** Your work is on GitHub and you can clone fresh to a new machine.

---

## Phase B — Walk every test path locally (1 day)

Find bugs while infra is still under your control. Use the URLs in `docs/launch-playbook.md` → Phase B references in your memory, or copy from below.

Setup before testing:
- [ ] **B1. 🟢** All dev servers up: web (3000), worker, Prisma Studio (5555), local Redis. (`stripe listen` after you re-auth — see B6.)
- [ ] **B2. 🟢** Open Prisma Studio at http://localhost:5555 and clear any stale `PENDING_PAYMENT` appointments from prior testing.

### Client flows (test as a brand-new user — incognito window)
- [ ] **B3. 🟢** Discover → http://localhost:3000/explore — filters work, map loads, mobile feed/map toggle works
- [ ] **B4. 🟢** Provider profile → http://localhost:3000/injusstice-nails — cover, avatar, portfolio fade-in, sticky book bar on mobile (380px viewport)
- [ ] **B5. 🟢** Reviews → http://localhost:3000/injusstice-nails/reviews — aggregate, individual reviews, stars
- [ ] **B6. 🟡** Re-auth Stripe CLI: `! stripe login` in your terminal. Then start the forwarder: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Note the new `whsec_…` and confirm it matches `STRIPE_WEBHOOK_SECRET` in `apps/web/.env.local`.
- [ ] **B7. 🟢** Book a service end-to-end. Card: `4242 4242 4242 4242`, any future expiry, any CVC. Watch:
  - horizontal slide between steps
  - deposit calc correct
  - Stripe redirect → success → webhook fires → confirmation page shows the booking
  - confirmation email arrives in Resend dashboard logs
- [ ] **B8. 🟢** Open the `manage` link from the email, reschedule, cancel.
- [ ] **B9. 🟢** Mark the appointment as completed via the dashboard. Then test pay-remaining-balance, feedback, and tip flows from the completion email.
- [ ] **B10. 🟢** Try edge cases: cash payment, free service (100% coupon), recurring booking, waitlist when no slots available.

### Provider flows (signed in as your test account)
- [ ] **B11. 🟢** http://localhost:3000/dashboard — Today view, KPIs, recent activity
- [ ] **B12. 🟢** Walk every dashboard page in `docs/launch-playbook.md` Phase B list. Specifically test:
  - **services/[id]**: create new service, add add-on group, add intake question
  - **availability**: change hours, add a block, verify booking flow respects it
  - **portfolio**: drag-drop a photo (will fail until R2 is wired — see D5)
  - **profile**: cover image upload, sticky save bar, books-open toggle, schedule open
  - **reminders**: toggle 24h on, edit template, verify in Prisma Studio that `ReminderSetting` row exists
  - **money**: range/granularity, CSV export downloads
  - **coupons**: create PERCENT, apply to a test booking, verify discount math
  - **messages/templates**: edit a template, preview with sample vars
  - **exports**: generate appointments export, verify CSV downloads
- [ ] **B13. 🟢** Test on your phone via http://10.0.0.70:3000 — confirm sticky bars don't overlap the home indicator, touch targets feel right, no horizontal scroll.

### Background jobs
- [ ] **B14. 🟢** Watch the worker terminal output for ~5 minutes — confirm no errors on each scheduled tick.
- [ ] **B15. 🟢** In Prisma Studio, check `NotificationLog` for new SENT/DELIVERED rows after the worker runs.

**Done with Phase B when:** You've completed at least one full booking-to-feedback loop end-to-end and noted every bug in a list. Triage that list before Phase C.

---

## Phase C — Fix the functional gaps (3–5 days)

These are the holes that block real beta users. They are not blockers for *testing*, but they will embarrass you in front of a real provider.

- [ ] **C1. 🟡 Provider onboarding flow.** Single biggest hole. Right now: signup via Clerk → empty dashboard. A new provider has no way to:
  - claim a slug (currently DB-seeded)
  - finish their profile (cover, bio, services)
  - know what to do next
  Build a step-by-step onboarding wizard: business name + slug check → photo + bio → first service → hours → review. Block dashboard access until complete. **2–3 days of work.**
- [ ] **C2. 🟡 Verification flow.** Decide:
  - (a) **Manual:** keep `isVerified` admin-only, you manually verify each beta provider in Prisma Studio after a phone call. Fine for first 20 providers.
  - (b) **Self-serve:** build a verify UI that asks for government ID + selfie, queues for review. Build later.
  **Recommendation:** (a) for beta.
- [ ] **C3. 🟡 Stripe Connect or direct routing.** Critical: how does money get from client to provider?
  - **Option A:** Platform holds funds, you manually pay out providers monthly (simplest, but Stripe will eventually flag you as a money transmitter — only OK at very small scale)
  - **Option B:** Stripe Connect (Standard or Express accounts) — providers onboard their own Stripe accounts, payments route directly to them, you take a platform fee. `Provider.stripeAccountId` already exists in the schema but the Connect onboarding is **not built**.
  - **Recommendation:** Connect Standard accounts. Estimated **3–5 days** to build the onboarding redirect + payout dashboard.
- [ ] **C4. 🟢 Sentry on the worker.** `apps/worker/src/index.ts` should `import * as Sentry from "@sentry/node"; Sentry.init({ dsn: process.env.SENTRY_DSN });` at the top.
- [ ] **C5. 🟢 Notifications page** — pick Inbox-only, Settings-only, or both. (Still deferred from earlier conversation. Won't block beta if dashboard nav hides it, but the menu item is currently linked.)
- [ ] **C6. 🟡 Schema gaps you flagged earlier**, in priority order:
  - `Provider.phone` field — adds 5 minutes, allows phone display on profile
  - Follow-up + rebook nudge reminder timing — schema work, ~1 day
  - Per-reminder message copy — schema work, ~1 day
  - Notification preferences for providers — schema work, ~1 day
  - **Recommendation:** ship beta without these. Add as users request them.

**Done with Phase C when:** A friend you've never told about this could sign up, finish onboarding, and start accepting bookings without you intervening.

---

## Phase D — Production infrastructure (1–2 days)

Move from localhost to a real internet-facing deployment. Do this **before** switching to live Stripe keys.

- [ ] **D1. 🟢 Upstash Redis (production cache + rate limit)**. Sign up at https://upstash.com. Create a database in a region close to your Vercel region (likely `us-east-1`). Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Add to web `.env.local` and to your production env.
- [ ] **D2. 🟢 Deploy web to Vercel.** From the repo root: `npx vercel`. Connect the GitHub repo. Set the build command to `cd apps/web && pnpm build`. Set the root directory to `apps/web`. Add **all** environment variables (copy from your local `.env.local` but swap test→live where applicable; see Phase E).
- [ ] **D3. 🟢 Deploy worker.** Worker can't run on Vercel (long-running process). Options:
  - **Railway** (easiest, pay-as-you-go) — `railway up` from `apps/worker/`
  - **Render** (similar)
  - **Fly.io** (cheaper, more setup)
  - **Recommendation:** Railway for beta. Set the same env vars.
- [ ] **D4. 🔴 Custom domain.** Buy `porobook.app` (or whatever) from Namecheap/Porkbun. Point its DNS at Vercel. Add the domain in Vercel project settings. Wait for SSL.
- [ ] **D5. 🟢 R2 production bucket.** In Cloudflare dashboard, create a new R2 bucket called `porobook-prod-media`. Configure CORS to allow your production domain. Generate API tokens. Update production env (`R2_BUCKET_NAME`, `R2_ENDPOINT`, etc.) to point at the new bucket. Test portfolio upload from the deployed app.
- [ ] **D6. 🟢 Verify Resend sending domain.** In Resend dashboard, add your domain. Set DNS records (SPF, DKIM, DMARC). Wait for verification. Update `RESEND_FROM_EMAIL` to `bookings@yourdomain` instead of dev defaults.
- [ ] **D7. 🟢 Production Twilio sender.** Trial Twilio numbers can only message verified phone numbers. Buy a real phone number from Twilio console, update `TWILIO_FROM_NUMBER`. (~$1/month + per-message cost.)
- [ ] **D8. 🟢 Update CSP for production domains.** In `next.config.js`, replace `https://clerk.nailbook.com` with whatever your real Clerk production domain becomes. Likely the same domain — verify after D9.
- [ ] **D9. 🟢 Clerk production tenant.** In Clerk dashboard, switch your project from dev to production. This requires the production domain (D4). Update `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the production values.

**Done with Phase D when:** A booking on your production domain completes end-to-end using a Stripe test card, with the confirmation email arriving from your verified sending domain.

---

## Phase E — Switch from test to live (½ day)

Only do this after Phase D is verified. Mistakes here move real money.

- [ ] **E1. 🔴 Get Stripe live keys.** Stripe dashboard → activate live mode. Requires:
  - Business entity (LLC or sole prop is fine)
  - EIN
  - Bank account for payouts
  - Business address
  - Identity verification of the business owner
  - Description of your platform business model
- [ ] **E2. 🔴 Stripe Connect production.** If using Connect (recommended — see C3): submit your platform application to Stripe. Approval typically 1–3 business days. **Without this, providers can't get paid through your platform.**
- [ ] **E3. 🟢 Update production env** with `sk_live_…` + `pk_live_…`. Generate a **production** webhook endpoint in Stripe → copy the new `whsec_…` to production env.
- [ ] **E4. 🟢 Re-deploy** web + worker so they pick up the new keys.
- [ ] **E5. 🟢 Smoke test with $0.50.** Book a real service (yours) with a real card. Pay the deposit. Confirm webhook fires. Cancel the booking, confirm refund.
- [ ] **E6. 🟢** Verify Stripe Tax is enabled (or you've explicitly decided you don't need it for your states).

**Done with Phase E when:** A real card has charged a real amount and the money is sitting in your real Stripe balance.

---

## Phase F — Legal + business (1 week, parallel with D + E)

Don't put this off — it can take longer than the code.

- [ ] **F1. 🔴 Business entity.** LLC is usually the right answer for a solo founder. Cost: $50–$500 depending on state. Stripe Atlas can do this in ~1 week if you don't already have one. https://stripe.com/atlas
- [ ] **F2. 🔴 EIN from the IRS.** Free, takes 15 minutes online. Required for Stripe.
- [ ] **F3. 🔴 Business bank account.** Mercury, Brex, or a local bank. Connect to Stripe for payouts.
- [ ] **F4. 🔴 Attorney review of privacy + terms.** Your current pages are template-generic. A startup-friendly attorney can review for $500–$1500. Specifically ask them to address:
  - You are a **marketplace** between provider and client, not the service provider
  - **Liability disclaimers** — what happens if a provider injures a client? (Hint: not your problem if drafted correctly)
  - **Dispute resolution** — Stripe handles payment disputes, you handle service disputes
  - **Data deletion / GDPR** — even though you're US-only initially
- [ ] **F5. 🔴 Stripe merchant agreement.** Read it before signing E1. Note the prohibited businesses list — adult, gambling, etc. Beauty services are fine.
- [ ] **F6. 🟡 Insurance.** For a marketplace platform, **General Liability** + **Errors & Omissions** is the typical pair. ~$500–$1500/year via Embroker, Vouch, or Hiscox. Not legally required for beta but smart before you have 100 providers.
- [ ] **F7. 🟡 Tax setup.** Stripe Tax can handle sales tax for you if you've enabled it. For provider payouts, you'll need to issue 1099s to providers who earn >$600/year. Set this up at https://stripe.com/connect/payouts — you can defer until you actually have a provider hitting that threshold.

**Done with Phase F when:** Stripe live mode is activated AND you have written legal docs that an attorney has reviewed.

---

## Phase G — Recruit your beta cohort (1 week)

Don't open registration yet. Hand-pick 3–5 providers.

- [ ] **G1. 🟡 Define your beta criteria.** Suggested:
  - Black female beauty professional
  - Independent (not a chain employee)
  - Currently using Square / Acuity / GlossGenius / Instagram DM for booking
  - Located in [your city] — easier to coordinate first calls and respond to issues
  - Books 5–20 appointments per week (enough volume to surface bugs, not so much that bugs lose them money)
- [ ] **G2. 🟢 Recruit through your network first.** Don't cold DM. Ask friends-of-friends. The pitch:
  > "I'm building a booking platform specifically for Black beauty professionals. Early beta is invite-only — you get free use for 6 months and your feedback shapes the product. 30 min onboarding call with me. Are you in?"
- [ ] **G3. 🟢 Onboarding call SOP.** For each beta provider:
  - 30-minute Zoom or in-person
  - Walk them through signup → onboarding wizard → first service → first portfolio upload
  - Manually flip their `isVerified=true` in Prisma Studio during the call
  - Share their public link with their existing client base
  - Promise: you'll respond to any issue within 4 business hours
- [ ] **G4. 🟢 Set up your monitoring dashboard.** Daily:
  - Sentry for errors
  - Stripe for failed payments
  - A Notion or Linear board for bugs/requests
  - DM check-in with each beta provider every Friday for the first month
- [ ] **G5. 🟡 Pricing decision (defer if you can).** Charge or free?
  - **Recommendation:** Free for the first 6 months of beta. After that, decide between flat $X/month or X% take rate. Most beauty booking platforms do 1.5–3% on top of Stripe fees.

**Done with Phase G when:** You have 3–5 providers actively taking bookings through your platform, each with at least 5 completed appointments.

---

## Phase H — Open to public beta (when you have signal)

Don't do this until G has produced clear signal — providers re-engaging, clients rebooking, no critical bugs for 2 weeks.

- [ ] **H1. 🟢 Self-serve provider signup.** Remove the invite-only gate. Onboarding wizard handles everything.
- [ ] **H2. 🟡 Provider verification flow** (see C2b) — manual review queue, you process within 48 hours.
- [ ] **H3. 🟢 Provider profile pages indexable.** Add proper `robots.txt` + `sitemap.xml`. Submit to Google Search Console + Bing. (You already have `robots.ts` and `sitemap.ts` — verify they're populated correctly.)
- [ ] **H4. 🟡 Launch announcement.** A single Instagram/TikTok post + a thread, drafted to:
  - Show the editorial vibe (use your brand photography from `apps/web/public/brand/`)
  - Open with the problem you solve (booking via DM is broken)
  - End with a clear CTA (sign up at porobook.app or referral form)
- [ ] **H5. 🟢 Support workflow.** A `support@porobook.app` inbox that you check daily. A simple FAQ. Response SLA: 24 hours for the first 100 users, then move to a help desk tool (Crisp, Intercom, Plain).
- [ ] **H6. 🟡 First marketing dollar.** Don't spend yet. Wait until you have:
  - 50+ providers
  - $5k+ GMV/month
  - Clear paid acquisition channel (e.g., one Instagram ad converts for under $20 per signup)
  - **Then:** spend $500/month for 3 months, measure CAC vs. payback.

**Done with Phase H when:** Public can sign up without your involvement, and you're hitting growth signals you can defend with numbers.

---

## Emergency runbook (bookmark this)

When something breaks in production:

| Symptom | First thing to check |
|---|---|
| All booking 500s | Sentry → see the error → most likely Prisma connection (rotate DB password if exposed) or Stripe webhook secret mismatch |
| Webhooks not firing | Stripe dashboard → Webhooks → see deliveries → re-send if needed. Verify endpoint URL matches production. |
| Emails not sending | Resend dashboard → Logs. Check for domain reputation issues (SPF/DKIM). |
| Provider can't login | Clerk dashboard → User search → look for verification status. If the Clerk tenant is in dev mode by accident, switch to prod. |
| Slow page loads | Vercel → Analytics → look for cold-start cascade. Upstash Redis for cache hit rate. |
| Money disputed | Stripe dashboard → Disputes. Respond within 7 days with the appointment evidence. |

---

## Quick conversion to Word / PDF (later)

```bash
# Install pandoc once:
brew install pandoc

# Then any time you want a .docx:
pandoc docs/launch-playbook.md -o launch-playbook.docx --reference-doc=template.docx

# Or PDF:
pandoc docs/launch-playbook.md -o launch-playbook.pdf --pdf-engine=xelatex
```

Or just print this markdown directly from your editor.

---

## TL;DR for impatient days

If you only do 5 things this week:

1. Push code to GitHub (Phase A)
2. Walk one complete booking-to-feedback loop locally (Phase B)
3. Build the **provider onboarding wizard** (Phase C1) — the only true engineering blocker for beta
4. Deploy to Vercel + Railway with Upstash + verified Resend domain (Phase D)
5. Recruit 3 beta providers from your network — don't wait for the product to be perfect (Phase G)

Everything else can wait.
