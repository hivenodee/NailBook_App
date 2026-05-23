# Mobile responsiveness audit

**Audited:** 2026-04-27 across all redesigned pages and shared components.
**Viewports targeted:** 380px (small phone) and 768px (tablet portrait).
**Method:** Static source scan for known mobile-failure patterns. Visual rendering not performed.

---

## High severity — fix immediately

### H1. Sticky bottom bars without safe-area-inset

iPhone home indicator overlaps these on devices with a notch.

| File | Line | Issue |
|------|------|-------|
| `app/(public)/[slug]/book/page.tsx` | 566 | Continue bar `fixed bottom-0` lacks `safe-bottom` |
| `app/(public)/[slug]/page.tsx` | 356 | StickyBookBar `fixed bottom-0 lg:hidden` lacks `safe-bottom` |
| `app/dashboard/profile/page.tsx` | 849 | Sticky save bar `fixed bottom-0` (mobile) lacks `safe-bottom` |

**Fix:** add `safe-bottom` utility (defined in `globals.css` line 141) to each `fixed bottom-0` bar's padding wrapper.

### H2. Icon-only touch targets at 36px (under 44px Apple minimum)

| File | Line | Element |
|------|------|---------|
| `components/booking/StepShell.tsx` | 65 | Back button `h-9 w-9` |
| `components/layout/SidebarNav.tsx` | 278 | More-sheet close button `h-9 w-9` |
| `app/dashboard/messages/templates/page.tsx` | 393 | Preview-modal close button `h-9 w-9` |
| `app/dashboard/profile/page.tsx` | 392 | Avatar camera-toggle button `h-9 w-9` (uses absolute positioning, may be acceptable as decorative overlap on a larger ring) |

**Fix:** bump to `h-11 w-11` (44px) on mobile. Optionally `sm:h-9 sm:w-9` to keep desktop dense.

### H3. Static multi-column grids that collapse to <100px wide on 380px

| File | Line | Issue |
|------|------|-------|
| `app/dashboard/clients/[id]/page.tsx` | 164 | `grid grid-cols-3 gap-6` for stat row at all widths — at 380px each cell is ~110px, holding date strings and dollar amounts. Cramped. |

**Fix:** `grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6` (stack on mobile).

Tip and time-slot grids (`grid-cols-4` and `grid-cols-3`) hold short labels like `$5` / `9:00 AM` and read OK at 380px — left as-is.

---

## Medium severity — fix this pass

### M1. Display headings without responsive scaling

`text-4xl` (36px) at 380px is large but not broken; the brand register handles it. `text-5xl+` without scaling is more aggressive.

| File | Line | Issue |
|------|------|-------|
| `app/(public)/[slug]/feedback/[appointmentId]/page.tsx` | (header) | `Heading variant="display"` + `text-4xl` no scaling |
| `app/(public)/[slug]/manage/[appointmentId]/page.tsx` | (header) | Same |
| `app/(public)/[slug]/tip/[appointmentId]/page.tsx` | (header) | Same |
| `app/(public)/[slug]/reviews/page.tsx` | (header) | Same |
| `app/dashboard/reminders/page.tsx` | (header) | Same |
| `app/dashboard/profile/page.tsx` | (header) | Same |
| `app/dashboard/messages/templates/page.tsx` | (header) | Same |
| `app/page.tsx` | 156 | Hero `text-5xl md:text-6xl lg:text-7xl` — 5xl is fine on mobile but bumping starting size to `text-4xl sm:text-5xl ...` is safer |

**Fix:** `text-3xl sm:text-4xl` for dashboard page titles, `text-4xl sm:text-5xl md:text-6xl` for hero.

### M2. Filter chip touch targets at 32–36px

Chips in horizontal scrolling filter lists across explore, history, money, feedback, waitlist, coupons. Common pattern, technically below 44px but ergonomically OK because the chip row is large enough to tap reliably and chips have wide hit areas via padding.

**Decision:** **leave as-is.** Bumping every chip to 44px tall would compress vertical content. Industry-standard pattern (Apple Maps, Resy, etc. use 32px chips).

### M3. Modal/drawer cancel + save buttons at 36px (`Button size="sm"`)

Used in `AvatarCropModal`, `BlockTimeModal`, message-templates preview, profile sticky save bar. Functional but tight on mobile.

**Decision:** modal action bars work — buttons are full-width or near it via flex, hit areas are big. Leave size="sm" for now; bump to size="md" only if real-device testing surfaces issues.

---

## Low severity — defer

### L1. Hero scaling on landing page

`text-5xl md:text-6xl lg:text-7xl` (line 156, `app/page.tsx`) — readable but visually heavy. Not breaking.

### L2. Tight gaps on stat grids

`gap-6` between stat cards at 380px crowds the columns once they collapse. After H3 fix this becomes a non-issue (grids stack).

---

## Verified-OK items (confirmed safe)

- ✅ Mobile bottom nav: 52px tall (`min-h-[52px]`), safe-area-inset applied. Touch targets meet spec.
- ✅ Dashboard layout pads `pb-16` on mobile to clear bottom nav.
- ✅ Booking flow: `max-w-md` + `px-6` → 320px content area at 380px viewport, no overflow.
- ✅ Date scrubber and filter rows: `overflow-x-auto` with `-mx-6 px-6` bleed pattern, no overflow.
- ✅ Booking step horizontal slide animation: 64px, well within max-w-md container.
- ✅ Provider profile: cover ratio 16:9, avatar overlap, all flex-wrapped.
- ✅ All form inputs: `h-11` (44px) — meets touch target spec.
- ✅ All modals: `mx-4` gutter and `max-w-md` width — fits 380px.
- ✅ Service list cards: stack vertically with full-width Book Now button.
- ✅ Notifications page is excluded — pending separate redesign.

---

## Fix plan (this pass)

1. Add `safe-bottom` utility to three sticky bars (book continue, public sticky book, profile save).
2. Bump four icon-only close/back buttons from `h-9 w-9` to `h-11 w-11`.
3. Stack client-detail stat row vertically on mobile.
4. Add responsive scaling (`text-3xl sm:text-4xl`) to seven page titles.
5. Type-check.

Total: **~15 surgical edits across 10 files.**
