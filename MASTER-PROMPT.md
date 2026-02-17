# OPUS 4.6 MASTER PROMPT — NailBook V1 Agent Team Build + Revenue Intelligence Refinement

You are working inside the NailBook monorepo located at `~/Documents/nailbook_app/nailbook`.

---

## PRE-FLIGHT: Read Before Doing Anything

Before writing ANY code, read and internalize these files in order:

1. `CLAUDE.md` — V1 scope guardrails, coding rules, project conventions
2. `FEATURES.md` — full feature inventory of what exists today
3. `docs/architecture.md` — system architecture and invariants
4. `docs/ui-guidelines.md` — design system, color tokens, layout principles
5. `docs/v1-audit.md` — known issues and audit findings
6. `docs/api-reference.md` — all 41 existing API endpoints
7. `.claude/skills/build-with-agent-team/SKILL.md` — how to spawn and coordinate agent teams
8. `plans/BUILD-ORDER-AND-SUMMARY.md` — build order and dependency graph
9. `plans/TEMPLATE.md` — plan template format

---

## IMMUTABLE CONSTRAINTS

These rules override everything. Do not violate them under any circumstances:

1. **Do NOT add new product surfaces** beyond what's defined in the plans.
2. **Do NOT introduce AI features, forecasting, or predictive analytics.**
3. **Do NOT expand beyond V1 guardrails** unless explicitly justified and documented.
4. **UI must follow `ui-guidelines.md`** — warm palette, calm aesthetic, 8pt grid, one primary action per screen.
5. **All revenue logic must derive from authoritative data** (Payment + AppointmentEvent records), never inferred from UI assumptions or Stripe API calls.
6. **No silent data deletion.** All destructive operations require explicit confirmation patterns.
7. **All provider data must remain scoped by `providerId`.** No cross-provider queries.
8. **Shared validation via Zod schemas in `@nailbook/shared`** — no inline validation in route handlers.
9. **Lazy service initialization** — Stripe, Redis, S3, email, SMS clients use getter patterns.
10. **Graceful degradation** — Redis, email, SMS fall back silently when not configured.

---

## MISSION: TWO-TRACK PARALLEL BUILD

You will run **two parallel workstreams** using tmux agent teams:

### Track A: Revenue Intelligence Refinement (Audit + Harden)
### Track B: V1 Feature Build (from plans/)

These tracks run simultaneously in separate tmux sessions.

---

## TRACK A — Revenue Intelligence Refinement

### Phase A1 — Audit Current Money & Analytics Implementation

1. Locate the `/dashboard/money` page in `apps/web/src/app/dashboard/money/`.
2. Trace the API call to `/api/dashboard/analytics`.
3. Inspect how these values are computed:
   - `revenue`
   - `lostRevenue`
   - `recoveredRevenue`
   - `netRevenue`
   - `appointmentCount`
   - `cancelledCount`
   - `noShowCount`
4. Confirm whether calculations derive from:
   - **Payment records** (preferred, authoritative)
   - **Appointment status** (acceptable ONLY for counts, not dollar amounts)
5. Confirm `waitlistRecoveryCount` logic matches WaitlistEntry status flow (ACTIVE → AVAILABLE → NOTIFIED → BOOKED).

**Output a report** before proceeding:
- Current calculation logic (quote the actual code)
- Any inconsistencies or edge cases found
- Any violation of `architecture.md` invariants
- **Do not modify code yet.**

### Phase A2 — Refine Revenue Definitions (If Needed)

If Phase A1 found inconsistencies, refactor `/api/dashboard/analytics` so that:

| Metric | Definition |
|--------|-----------|
| **Revenue** | Sum of COMPLETED Payment records where type is DEPOSIT, FULL, or BALANCE, excluding REFUND |
| **Lost Revenue** | Sum of appointment totals for CANCELLED + NO_SHOW appointments in range, minus any retained deposits |
| **Recovered Revenue** | Revenue from appointments where the associated WaitlistEntry status went through ACTIVE to BOOKED |
| **Net Revenue** | Revenue minus Lost Revenue |

**Rules:**
- Never double-count deposits (a deposit that becomes part of a completed appointment is counted once as revenue, not as both deposit and balance)
- Never infer revenue from Stripe API — use only local Payment records
- Never compute money from raw appointment totals without checking Payment records
- All calculations must be timezone-safe (use provider's timezone from AvailabilityRule)
- Refund handling: subtract refunded amounts from revenue, don't add them to lost

### Phase A3 — UI Refinement (Not Expansion)

Review the Money page UI against `ui-guidelines.md`:

**Check:**
- Calm aesthetic compliance (warm palette, not corporate blue)
- Only one dominant chart (line chart for revenue over time)
- KPI cards are minimal (4 max: revenue, lost, recovered, net)
- Ledger-first design (transaction list is the primary data view)
- No excessive dashboard clutter

**If UI feels too "analytics heavy", simplify:**
- Reduce chart prominence (smaller, secondary to ledger)
- Emphasize ledger-first design
- Keep KPI cards minimal with clear labels

**Do NOT:**
- Add new graphs
- Add heatmaps or sparklines
- Add forecasting or projections
- Add multi-chart dashboards
- Add comparison periods

### Phase A4 — Edge Case Hardening

Add defensive handling in the analytics calculation for:

| Edge Case | Expected Behavior |
|-----------|------------------|
| Full refund on completed appointment | Subtract from revenue; do NOT add to lost |
| Partial balance payment | Revenue = deposit + partial balance (what was actually paid) |
| Deposit-only booking (no balance collected) | Revenue = deposit amount only |
| Cash booking (no Stripe payment) | Revenue counted from Payment record with method=CASH |
| Mixed payment types (card deposit + cash balance) | Sum both Payment records |
| Stripe webhook retry/duplicate | Idempotent — check for existing Payment record before creating |
| Cancelled before payment completes | Lost = full appointment total (no deposit to subtract) |
| No-show with deposit kept | Lost = appointment total minus deposit amount |
| No-show with deposit refunded | Lost = full appointment total |

### Phase A5 — Tests

If analytics logic changed in Phase A2:

Write unit tests covering:
- [ ] Cancelled with retained deposit
- [ ] Cancelled with refunded deposit
- [ ] No-show with deposit kept
- [ ] No-show with deposit refunded
- [ ] Waitlist-recovered booking
- [ ] Multi-payment appointment (deposit + balance)
- [ ] Balance collected after completion
- [ ] Cash-only booking
- [ ] Mixed card + cash booking
- [ ] Refunded completed appointment

**Test rules:**
- Use Prisma test database or mocked data
- Do NOT break existing test suite
- Place tests adjacent to the code they test

### Phase A6 — Track A Final Output

When Track A completes, provide:
1. Summary of changes made
2. Files modified (full list)
3. Revenue definition explanation (final version)
4. Edge cases handled (table)
5. A-Z manual test steps:
   - A. Create a service ($75, 60min, $20 flat deposit)
   - B. Create a confirmed booking, verify revenue shows $20 (deposit)
   - C. Complete the booking, collect $55 balance, verify revenue shows $75
   - D. Cancel a different booking (with deposit), verify lost revenue = $75 minus $20 = $55
   - E. Cancel a booking (no deposit), verify lost revenue = full price
   - F. Mark no-show (deposit kept), verify lost = price minus deposit
   - G. Mark no-show (deposit refunded), verify lost = full price, revenue decreases by deposit
   - H. Create waitlisted booking, approve from waitlist, complete, verify recovered revenue
   - I. Verify Money dashboard KPIs match the ledger totals
   - J. Verify transaction ledger shows all payment events with correct statuses
   - K. Switch time range (7d/30d/90d/1y), verify numbers update
   - L. Switch granularity (daily/weekly/monthly), verify chart updates
6. Risk assessment (what could break, what to watch)

---

## TRACK B — V1 Feature Build

Use the agent team skill to build features from the plans in `plans/`. Build in this order:

### B1. Push Notifications & Email Reminders
```
/build-with-agent-team plans/push-notifications-email-reminders.md 3
```

**Agent structure (suggested):**
- **Agent 1 (Schema):** Add PushToken, NotificationLog, ReminderSetting models + enums + relations. Run `prisma validate`. Add Zod schemas to `@nailbook/shared`.
- **Agent 2 (API + Worker):** Build 5 new API endpoints. Update worker reminder job to check ReminderSetting and dispatch to push channel. Add receipt checker + retry jobs.
- **Agent 3 (UI):** Build `/dashboard/reminders` and `/dashboard/notifications` pages. Mobile push token registration on auth.

**Wait for completion. Validate:**
```bash
cd packages/db && npx prisma validate
pnpm tsc --noEmit
pnpm dev  # verify it starts
```
**Commit:** `git add -A && git commit -m "feat: push notifications and email reminders"`

---

### B2. In-App Messaging Improvements
```
/build-with-agent-team plans/in-app-messaging-improvements.md 3
```

**Agent structure (suggested):**
- **Agent 1 (Schema):** Add fields to Thread + Message models. Add MessageAttachment, TypingIndicator models + enums. Migration.
- **Agent 2 (API):** Build 10 new/modified endpoints. Attachment upload to R2. Polling endpoints.
- **Agent 3 (UI):** Enhance web dashboard messages page. Build mobile chat screens.

**Wait. Validate. Commit:** `"feat: enhanced in-app messaging with attachments and read receipts"`

---

### B3. Mobile App Provider Features
```
/build-with-agent-team plans/mobile-provider-features.md 3
```

**Agent structure (suggested):**
- **Agent 1 (Navigation + Shell):** Set up ProviderTabNavigator, stack navigators, shared components (AppointmentCard, StatusBadge, KPICard, EmptyState).
- **Agent 2 (Screens):** Build Today, Calendar, Clients, Money, Profile screens.
- **Agent 3 (API Client):** Build typed API client with Clerk token injection. Wire all screens to endpoints.

**Wait. Validate. Commit:** `"feat: mobile provider app — today, calendar, clients, money, profile"`

---

### B4. Mobile App Client Features
```
/build-with-agent-team plans/mobile-client-features.md 3
```

**Agent structure (suggested):**
- **Agent 1 (Schema + API):** Add SearchHistory model. Build 6 new client API endpoints. Zod schemas.
- **Agent 2 (Navigation + Screens):** ClientTabNavigator, Feed, Search, Bookings, Messages, Profile screens.
- **Agent 3 (Booking Flow):** Build 3-step native booking flow with Stripe React Native payment sheet.

**Wait. Validate. Commit:** `"feat: mobile client app — feed, search, bookings, messages, profile"`

---

### B5. Client Discovery Feed
```
/build-with-agent-team plans/client-discovery-feed.md 3
```

**Agent structure (suggested):**
- **Agent 1 (Schema + API):** Add FeedItem, FeedLike models + enums. Build 7 feed endpoints.
- **Agent 2 (Web):** Build `/discover` page (SSR masonry grid) + `/dashboard/feed` management page.
- **Agent 3 (Mobile):** Build Feed tab screen + FeedItemDetailScreen. Like interactions.

**Wait. Validate. Commit:** `"feat: client discovery feed with likes and trending tags"`

---

## TMUX SESSION SETUP

Open **two tmux sessions** — one per track:

```bash
# Session 1: Revenue audit (Track A)
tmux new-session -s track-a -d
tmux send-keys -t track-a 'cd ~/Documents/nailbook_app/nailbook && claude' Enter

# Session 2: Feature builds (Track B)
tmux new-session -s track-b -d
tmux send-keys -t track-b 'cd ~/Documents/nailbook_app/nailbook && claude' Enter
```

Inside Track B, the agent team skill will spawn additional tmux panes per agent (3 panes per feature build). So you'll see:

```
track-a: 1 pane  (revenue audit — single Claude session)
track-b: 3 panes (agent team — lead + 2-3 sub-agents)
```

**Coordination rule:** Track A should complete Phase A1 (audit) before Track B touches any analytics-related code. Track B's feature builds don't overlap with Track A's scope (Money page), so they can run in parallel from the start.

---

## AFTER ALL TRACKS COMPLETE

### Final Integration Validation

```bash
# 1. Full type check
pnpm tsc --noEmit

# 2. Schema validation
cd packages/db && npx prisma validate

# 3. Build all packages
pnpm build

# 4. Dev server starts
pnpm dev

# 5. Verify web routes
# /dashboard/money — Track A changes
# /dashboard/reminders — Plan 1
# /dashboard/notifications — Plan 1
# /dashboard/messages — Plan 2 enhancements
# /dashboard/feed — Plan 5
# /discover — Plan 5

# 6. Verify mobile
cd apps/mobile && npx expo start
# Provider tabs: Today, Calendar, Clients, Money, Profile
# Client tabs: Feed, Search, Bookings, Messages, Profile

# 7. Run existing tests
pnpm test  # must not break existing tests

# 8. Run new tests (Track A)
# Revenue analytics tests added in Phase A5
```

### Final Commit
```bash
git add -A
git status  # review everything
git commit -m "NailBook V1 complete — all features + revenue hardening"
git push
```

### Update Project Docs
After all builds succeed, update:
- `FEATURES.md` — add all new features to inventory
- `CLAUDE.md` — add any new patterns or rules discovered during builds
- `docs/api-reference.md` — add all new endpoints

---

## CONFLICT AVOIDANCE RULES

Since Track A and Track B touch different parts of the codebase, conflicts should be minimal. But enforce these rules:

1. **Track A owns:** `apps/web/src/app/api/dashboard/analytics/`, `apps/web/src/app/dashboard/money/`, and any revenue-related test files.
2. **Track B owns:** Everything else — new models, new endpoints, new pages, mobile app.
3. **Shared files both might touch:** `packages/db/prisma/schema.prisma` — Track A should NOT modify the schema. Only Track B adds new models. If Track A needs schema changes (unlikely), it must wait for Track B's schema agent to finish first.
4. **If a merge conflict arises:** The lead agent resolves it by keeping both changes, never discarding either track's work.

---

## SUCCESS CRITERIA

The build is complete when:
- [ ] All 5 feature plans pass their acceptance criteria
- [ ] Revenue analytics audit is complete with test coverage
- [ ] `pnpm tsc --noEmit` passes
- [ ] `prisma validate` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm dev` starts all apps without errors
- [ ] Existing test suite still passes
- [ ] New revenue tests pass
- [ ] FEATURES.md is updated
- [ ] All changes are committed and pushed
