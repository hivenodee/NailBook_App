# Pre-Launch Production Audit

**Date:** 2026-04-26
**Scope:** `apps/web/src/` (primary), `apps/mobile/src/` and `packages/shared/src/` (secondary)
**Excluded:** `node_modules`, `.next`, `__tests__`, `*.test.*`, `*.spec.*`, `scripts/`, prisma seeds

---

## Summary

| Severity | Count |
|---|---|
| Blocker | 1 (brand name inconsistency, 18 occurrences) |
| Minor / acceptable | 4 |
| Clean categories | 7 |

The codebase is **largely production-clean**. The single blocker is a brand-name capitalization mismatch (`PoroBook` vs `Porobook`) spread across user-facing pages, metadata, and emails. No placeholder text, no test data, no missing alts, no broken images, no debug components were found.

---

## 1. console.log / console.warn / console.error in component & page files

| File | Line | Code | Note |
|---|---|---|---|
| `apps/web/src/components/AvatarCropModal.tsx` | 76 | `console.error("Crop failed:", e);` | Inside `handleSave()` error catch. **Legitimate**, not a development artifact. Fine to keep. |
| `apps/mobile/src/app/_layout.tsx` | 71 | `registerForPush().catch(console.error);` | Async initialization fallback. **Legitimate**. |

API-route `console.error` calls are not flagged — server-side error logs are expected in production.

---

## 2. Lorem ipsum / placeholder text

**None found.** Searched for: `lorem`, `ipsum`, `dolor sit`, `TODO write`, `placeholder text`, `fix this copy`, `TKTK`, `[insert`.

---

## 3. TODO / FIXME / XXX / HACK in JSX or near user-facing strings

**None found** in JSX or rendered strings.

---

## 4. Hardcoded test strings in user-facing code

**None found.** No `test@test.com`, `John Doe`, `asdf`, `foo/bar/baz`, `1234567890` defaults, or similar in user-facing components.

---

## 5. Broken / suspicious image paths

**None found.**
- All `<Image>` components source from DB-driven URLs (`provider.coverImageUrl`, `asset.url`, etc.).
- No `via.placeholder.com`, `picsum.photos`, `placekitten`, or random Unsplash hotlinks.
- No `localhost`, `/tmp/`, or absolute filesystem paths.
- `apps/web/public/` contents verified — only `logo.png` exists, and no component references missing public assets.

---

## 6. Missing `alt` props on `<img>` / `<Image>`

**None found.** Every image in `src/app/` and `src/components/` has a non-empty alt.

---

## 7. Dev-only labels / brand-name inconsistencies

### 7a. Brand-name inconsistency — **BLOCKER**

Codebase mixes `PoroBook` (camelCase) with `Porobook` (capitalized). The product spec at `/Users/justiceheughn/Documents/nailbook_app/CLAUDE.md` uses `Porobook`. Internal package names (`@nailbook/shared`, `@nailbook/db`) use the legacy `Nailbook` — those are non-user-facing and consistent with each other, so they are not flagged.

| File | Line(s) | Form used | User-facing? |
|---|---|---|---|
| `apps/web/src/app/layout.tsx` | 53 | `"PoroBook"` | Yes — `<title>` metadata |
| `apps/web/src/components/ui/Logo.tsx` | 58 | `PoroBook` | Yes — rendered logo text |
| `apps/web/src/components/ui/ThemeToggle.tsx` | 9, 20 | `"porobook-theme"` | No — localStorage key |
| `apps/web/src/app/(public)/[slug]/page.tsx` | 53, 56 | `PoroBook` | Yes — OpenGraph title |
| `apps/web/src/app/(public)/[slug]/confirmation/page.tsx` | 60 | `Porobook` | Yes — calendar invite text |
| `apps/web/src/app/privacy/page.tsx` | 4, 19, 37, 84, 85 | `Porobook` / `porobook.app` | Yes — body text, contact email |
| `apps/web/src/app/terms/page.tsx` | 4, 19, 28–29, 73, 82, 102, 103 | `Porobook` / `porobook.app` | Yes — body text, contact email |
| `apps/web/src/app/sitemap.ts` | 7 | `https://porobook.app` | Indirect — sitemap fallback domain |
| `apps/web/src/app/robots.ts` | 4 | `https://porobook.app` | Indirect — robots fallback domain |
| `apps/web/src/app/api/exports/[id]/download/route.ts` | 35 | `"porobook-"` filename prefix | Yes — downloaded CSV filename |

**Recommended canonical form:** `Porobook` (matches product spec). Logo and root `<title>` are the highest-impact mismatches.

### 7b. Other dev-only labels

- No `Altsociety`, `DEBUG`, `DEV ONLY`, `A/B test`, `experiment_`, or `feature_flag` strings found in user-facing copy.

---

## 8. Test/Demo/Example components imported by production routes

**None found.** No files matching `*Test*.tsx`, `*Demo*.tsx`, `*Example*.tsx`, `*Sandbox*.tsx`, `*Playground*.tsx` in `src/components/` or `src/app/`.

---

## 9. Other red flags

### 9a. `localhost:3000` fallbacks in API routes — acceptable

| File | Line |
|---|---|
| `apps/web/src/app/api/appointments/[id]/route.ts` | 289 |
| `apps/web/src/app/api/appointments/[id]/balance/checkout/route.ts` | 48 |
| `apps/web/src/app/api/appointments/[id]/collect-balance/route.ts` | 90 |

All three are `process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"` fallbacks. Server-side, only active if env var is missing. **Acceptable** — but ensure `NEXT_PUBLIC_APP_URL` is set in production env.

### 9b. Browser-native dialogs (`alert()` / `confirm()`)

Multiple intentional uses across components for error messages and destructive-action confirmations. Not development artifacts, but worth tracking as a UX-polish item — proper modals would feel less like "1990s web." **Not a launch blocker.**

### 9c. Commented-out code blocks

None > 5 lines. Only short JSX structural comments like `{/* Scrim */}`, `{/* Modal */}` — these are fine.

---

## Recommended fix order

1. **Standardize brand to `Porobook`** across the 10 files in §7a. Touch the Logo component and root layout `<title>` first — those are the most visible.
2. (Optional polish) Replace `alert()`/`confirm()` calls with the existing modal/toast components.
3. Verify `NEXT_PUBLIC_APP_URL` is set in production env so the localhost fallbacks in §9a never activate.

No fixes have been applied — this is read-only audit output.
