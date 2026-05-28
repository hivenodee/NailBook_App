# Bug log — Phase B testing

## Fixed in this session (2026-05-27)

- [x] **Console error: `customArt` DOM warning** (EmptyState.tsx:234) — props leaked through `...rest` spread. Extracted `icon` + `customArt` before spread.
- [x] **Dates display as previous day in dashboard** — `isToday()` in `dashboard/page.tsx` used browser-local comparison instead of provider timezone. Also `getBucket()` in `history/page.tsx` used `getDate()` (browser-local). Both now use `en-CA` date strings with `timeZone:` for provider-tz-aware comparison.
- [x] **`formatDate` in `clients/[id]/page.tsx` lacked timezone** — added `tz` parameter, all call sites updated.
- [x] **Missing email after rescheduling** — `/api/appointments/[id]` PATCH had no branch for `reschedule`. Added: re-sends booking confirmation with new time + re-schedules reminders.
- [x] **Missing email after balance paid** — Stripe webhook BALANCE branch only recorded the Payment row, no client email. Added `sendBalanceReceipt()` in `lib/email.ts` + wired into the webhook.
- [x] **"Send payment link" silent on dashboard** — no UX feedback after success. Added toast: "Payment link sent to client" / "Balance marked as paid in cash".
- [x] **Reschedule slot picker race condition** — "no times available" flashed before fetch completed. `slots` is now `null` until first fetch returns; loading state covers the gap.
- [x] **Invisible calendar icon** — CSS rule added to `globals.css` tinting `::-webkit-calendar-picker-indicator` to ink-500 with hover opacity.

- [x] **R2 CSP + CORS** — `*.r2.cloudflarestorage.com` was missing from CSP `connect-src` (only in `img-src`). Added. Also confirmed bucket CORS policy is configured. Cover + avatar uploads now work end-to-end.
- [x] **Cover redesign — too big / hard to read text overlay** — switched to X/Twitter pattern: full-bleed banner (2:1 mobile, 6:1 desktop) with avatar overlapping bottom-left of body column. Text moved below cover, left-aligned. Added `CoverCropModal` with 3:1 rectangular crop + zoom + grid guides; dashboard preview matches public profile aspect.
- [x] **Dark mode toggle was broken** — removed entirely (brand register is light-only like Aesop/PMG/Resy).

## To verify yourself (Cloudflare dashboard action, not code) — DONE

- [x] **R2 portfolio + cover photo uploads fail.** Fixed via CORS config + CSP update. Confirm:
  1. Open your bucket
  2. Settings → CORS Policy
  3. Add:
     ```json
     [
       {
         "AllowedOrigins": ["http://localhost:3000", "http://10.0.0.70:3000"],
         "AllowedMethods": ["PUT", "GET", "POST"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```
  4. Save. Re-try upload.
  Also when you go to production, add the production domain to AllowedOrigins.

## Not bugs / clarifications

- [x] **Pages load slow** — Next.js dev mode compiles on first hit. Production build is fast (Lighthouse 96 desktop). Not a bug.
- [x] **No "add group" / intake form option in services** — these only appear on the service **detail page** (after creating a service and clicking into it). They live at `/dashboard/services/[id]`. Not visible from the create-service drawer.
- [x] **No `ReminderSetting` row in Prisma Studio** — table starts empty. A row is created when you first toggle a reminder on at `/dashboard/reminders` and save. Confirm by toggling 24h on, saving, then refreshing Prisma Studio.
- [x] **Phone test takes me to Google** — autocomplete treated `10.0.0.70:3000` as a search query. Type `http://10.0.0.70:3000` explicitly with the `http://`, or add it as a homescreen bookmark.

## Background jobs verification (how-to)

Open Prisma Studio at http://localhost:5555 → `NotificationLog` table. Rows appear as the worker sends reminders/confirmations. You can also watch the worker terminal output live (`tail -f` the task output for ID `bcmd93d3b` if needed).

## Bugs reported but not yet fixed (deferred — schema or scope)

- **Upload presigned URL endpoints work, CORS likely failing** — fix above is a dashboard action, no code change.
- Anything else I missed? Add new findings below this line.
