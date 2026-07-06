# PoroBook — Design System

Use this when asking Claude about UI work, brand decisions, copy treatment, or anything visual.

The authoritative source is `apps/web/.claude/skills/porobook-design/SKILL.md` and `apps/web/src/lib/design-tokens.ts`. This doc is a readable companion.

---

## Brand register

**Editorial-grade luxury salon. Not utility SaaS.**

References (in order of how much they inform decisions):
1. **Aesop** — typography, restraint, no gradients
2. **Pat McGrath Labs** — editorial photography style, contrast against cream
3. **Mytopicals** — soft warmth, hand-photography
4. **Resy** — booking-flow patterns, sticky-bar mobile UX

**What we are not:**
- Material Design
- Generic shadcn/ui out-of-the-box (we use the primitives but heavily customize)
- Stripe-gradient era SaaS
- Bro-tech dashboards (analytics-grid layouts)
- "Girl boss" brands (Drybar, Bumble, etc.)
- Bright/neon beauty (Glossier, Olive & June)

---

## Voice in copy

| Principle | Yes ✓ | No ✗ |
|---|---|---|
| Confident, never apologetic | "Books open Thursday at noon." | "We're so excited to announce..." |
| Short sentences | "Booked. Take a moment." | "You have successfully completed..." |
| Sentence case for UI labels | "Book now" | "BOOK NOW" / "Book Now" |
| Specific nouns and verbs | "Pay deposit" | "Submit payment information" |
| No corporate filler | — | "leverage," "seamless," "robust," "empower," "scale" |
| No exclamation points (unless celebrating something specific) | "Reschedule confirmed" | "Reschedule confirmed!" |
| No em-dashes in production copy | "Books closed for two weeks, opening March 5." | "Books closed — for two weeks — opening March 5." |
| Real specifics over hedges | "Pay $25 deposit" | "Pay a small deposit" |

### Tone check

A high-end nail artist would feel comfortable sending the link to her clientele. A first-time client would book without thinking "this feels sketchy." A reader of *Cherry Bombe*, *The Cut*, or *NYT Wirecutter* would find it appropriate.

If a draft sounds like Mailchimp or Hubspot, rewrite. If it sounds like a magazine pull-quote, keep going.

---

## Color palette

All defined in `apps/web/src/lib/design-tokens.ts` and exposed as Tailwind utility classes via `tailwind.config.ts`. **Never hardcode hex values in components.**

### Cream (backgrounds + content surfaces)
| Token | Hex | Use |
|---|---|---|
| `cream-50` | `#FBF8F3` | Page background, card background, button text on rust |
| `cream-100` | `#F5EFE6` | Hover surface, subtle dividers, badge backgrounds |
| `cream-200` | `#EBE2D2` | Empty-state backgrounds, skeleton-shimmer base |

### Rust (accent + primary action)
| Token | Hex | Use |
|---|---|---|
| `rust-400` | `#D4843D` | Light rust for less prominent accents |
| `rust-500` | `#C4732A` | **Primary action color** — buttons, links, focus rings, active states, the dot in the PoroBook wordmark |
| `rust-600` | `#A85F1F` | Hover state for rust-500, darker accents |

**Rule:** rust is for *primary actions and accents only*. Never put body text on a rust background, never use rust for decorative elements. The brand is mostly cream + ink, with rust as a punctuation mark.

### Ink (typography + borders)
| Token | Hex | Use |
|---|---|---|
| `ink-100` | `#E8E2DA` | Subtle dividers below cream surfaces |
| `ink-200` | `#D6CDC2` | Card borders, input borders, fine separators |
| `ink-300` | `#9E9389` | Placeholder text, disabled icons |
| `ink-500` | `#6B5F55` | Secondary body text, metadata |
| `ink-700` | `#3D3530` | Strong body text |
| `ink-900` | `#1A1614` | Headings, primary text. **Never use pure black (`#000`).** |

### Status colors (semantic)
| Token | Hex | Use |
|---|---|---|
| `success` | `#4A7C59` | Verified badges, "Confirmed" states, success toasts |
| `warning` | `#C4732A` | Warning text (same as rust-500 — overlap intentional) |
| `error` | `#A8423A` | Validation errors, "Cancelled" state, destructive actions |

---

## Typography

Two families. Use design-token aliases, not raw font names.

### Display — Playfair Display (serif)
- Class: `font-display`
- For: page headings, hero copy, KPI amounts, prices on public cards, the PoroBook wordmark
- Letter-spacing: tight on display sizes (`tracking-tight`), normal at smaller sizes
- Line-height: `1.05`–`1.2` (display) → `1.3` (h3) → `1.5` (body)

### Body / UI — DM Sans (sans-serif)
- Class: `font-sans`
- For: body text, buttons, UI labels, eyebrows, metadata, all interactive elements
- Letter-spacing: normal, occasionally `tracking-widest` for uppercase eyebrows
- Line-height: `1.5` for body, `1.25` for tight UI

### Rule: no more than 3 type sizes visible at once
A page with a display heading, a section heading, and body text is the ceiling. Adding a fourth size (e.g. "small subhead") usually means restructuring the hierarchy is needed.

### Common sizes (after responsive scaling)

| Element | Mobile | Desktop |
|---|---|---|
| Page title (display variant) | `text-3xl` (30px) | `text-4xl` (36px) |
| Hero (`display` + className) | `text-4xl` (36px) | `text-5xl`–`6xl` (48–60px) |
| Section heading (h2/h3) | `text-2xl` (24px) | `text-2xl`/`text-3xl` |
| Subsection (h4) | `text-lg` (18px) | `text-xl` (20px) |
| Body | `text-base` (16px) | `text-base` (16px) |
| Metadata / labels | `text-sm` (14px) | `text-sm` (14px) |
| Eyebrow (uppercase tracking) | `text-xs` (12px) | `text-xs` (12px) |

Don't use `text-[10px]` or below for primary content. Reserve for tiny chrome (badges, mobile tab labels with icons).

---

## Components — the rules

The design system has primitives at `apps/web/src/components/ui/`. Use them. Don't recreate.

### `<Button>`
- Variants: `primary` (rust fill), `secondary` (cream + ink-700 border), `ghost` (transparent)
- Sizes: `sm` (h-9 / 36px), `md` (h-11 / 44px — touch-target safe), `lg` (h-14 / 56px)
- Built-in: pill or 8px radius, focus-visible ring rust-500 with 2px offset, hover translate-y-px lift, disabled opacity-50
- **Rule**: never roll a raw `<button>` with rust styling — use this. The primitive handles disabled, hover, focus, motion correctly.

### `<Card>`
- Padding: `none`, `sm` (p-4), `md` (p-6), `lg` (p-8)
- Border: 1px `border-ink-200`, no shadow by default
- Optional `hoverLift` prop adds 1px translate + border darken on hover
- **Rule**: never use raw `<div className="bg-cream-50 border ...">` for card-like surfaces. Use this.

### `<Heading>`
- Variants: `display` / `h1` / `h2` / `h3` / `h4`
- Renders as the matching tag, OR override with `as="h2"` etc. for semantic-vs-visual control
- Pre-styled (`font-display`, `text-ink-900`, tracking)
- **Rule**: use this for any heading. Don't write raw `<h1 className="font-display text-4xl">`.

### `<Input>`
- Built-in label + error + helper props
- Height `h-11` (44px touch-safe)
- Focus ring rust-500
- Border ink-300, hover ink-500, error error-color
- **Rule**: use this for every form input.

### `<Avatar>`
- Sizes: `sm` (24px) / `md` (36px) / `lg` (48px) / `xl` (72px)
- Optional `ring` prop adds rust-500 ring with cream offset
- Initials fallback when no `src`
- **Rule**: use this anywhere a profile photo appears.

### `<Badge>`
- Variants: `verified` (success), `neutral` (cream), `warning` (rust), `status` (cream darker), `error` (red)
- Pill shape, font-sans medium 12px

### `<EmptyState>`
- Variants: `icon` (default), `typographic` (giant display number), `asymmetric` (illustration to one side)
- Built-in motion: scale + fade entrance, 400ms ease-out
- **Rule**: every "no data" UI uses this primitive. Don't roll inline empty-state text.

### `<ErrorBanner>`
- For fetch failures and form-level errors
- Pattern: rounded border + error/10 bg + Try Again button
- Use after `try/catch` in any data-fetch effect

### `<PageTransition>`
- Wraps route children with `AnimatePresence` keyed on pathname
- 300ms ease-out fade + 8px slide-up on every route change
- Already wrapped in `app/(public)/template.tsx` and `app/dashboard/layout.tsx`

### `<TextureBackground>`
- Optional CSS-generated textures: `paper` / `linen` / `marble` / `rust`
- Intensity: `subtle` / `medium` / `strong`
- Use sparingly — max one per page

---

## Layout patterns

### Page header (dashboard)
```
<Heading variant="display" className="text-3xl sm:text-4xl">Profile</Heading>
<p className="text-base font-sans text-ink-500 max-w-xl">…subhead…</p>
```

### Section header (within a page)
```
<div className="flex items-center gap-3">
  <span className="h-px w-10 bg-rust-500" />
  <p className="text-xs font-sans font-medium tracking-widest uppercase text-rust-500">
    01 — Public profile
  </p>
</div>
<Heading variant="h2" className="text-2xl">What clients see</Heading>
<p className="text-base font-sans text-ink-500 max-w-xl">…</p>
```

### Card row (list item)
```
<Card padding="lg" hoverLift>
  <div className="flex justify-between items-start gap-4">
    <div className="min-w-0 flex-1">…</div>
    <Badge variant="verified">…</Badge>
  </div>
</Card>
```

### Filter chip (active vs inactive)
```
// Active:
"rounded-pill bg-rust-500 text-cream-50 border border-rust-500 px-4 py-1.5 text-sm font-sans font-medium"
// Inactive:
"rounded-pill bg-cream-50 text-ink-700 border border-ink-200 px-4 py-1.5 text-sm font-sans font-medium hover:border-ink-500"
```

### Toast (transient confirmation)
```
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
  <div className="rounded-md bg-ink-900 text-cream-50 text-sm font-sans font-medium px-4 py-2.5 shadow-soft">
    Payment link sent
  </div>
</div>
```

### Sticky save bar (form pages)
- Mobile: full-width bottom, safe-area-inset bottom padding
- Desktop: floating bottom-right card, 6px from edge
- Activates only when state diverges from last-saved snapshot

---

## Imagery

### Brand photography
- All 12 hero images in `apps/web/public/brand/` — see `MANIFEST.md` for per-asset usage
- Editorial: warm soft natural light, real Black women, no stock-default casting
- Always pull through `next/image`
- Use `editorial-hands-marble.jpeg` as default OG / social-share image
- Provider profile cover falls back to brand hero when provider hasn't uploaded one

### Illustrations
- Empty states use inline SVG (`components/ui/empty-art/`)
- Value props use inline SVG (`components/ui/value-art/`)
- No icons-as-illustration. No emoji as design.

### Icons
- Lucide React only (`lucide-react`)
- Size: 14–18px in UI, 24–28px in empty states
- Stroke width: 1.5 (default 2 is too heavy for the editorial register)

---

## Motion

Framer Motion. Rules:
- Page transitions: **300ms ease-out** fade + 8px slide up (`PageTransition` handles this)
- Card hover: **200ms ease-out**, 1px lift, border darken (via Tailwind `transition-all duration-200 hover:-translate-y-px hover:border-ink-300`)
- Discovery feed reveal: **50ms stagger** on scroll (`whileInView`)
- Booking step transitions: **300ms ease-out**, ±64px x-axis slide
- Empty state entrance: 0.96 → 1.0 scale + fade, 400ms ease-out
- **No bouncy springs.** No animations over 400ms. No motion on every component (use sparingly to create rhythm).

`useReducedMotion()` from Framer is wrapped around every motion variant so accessibility settings are respected.

---

## Mobile

The booking flow is **mobile-first**. Audited and fixed at 380px and 768px:
- All touch targets ≥44px (Apple HIG minimum)
- Sticky bars have `safe-bottom` utility (env(safe-area-inset-bottom))
- No horizontal overflow at 380px
- Date pickers and chip rows use `overflow-x-auto` with bleed pattern
- Modals use `mx-4` gutter and `max-w-md`
- Headings scale: `text-3xl sm:text-4xl` minimum

See `docs/mobile-audit.md` for the full pass.

---

## When in doubt

- Default to less, not more
- Whitespace is a feature, not waste
- One photograph per surface, never stacked
- Sharp rectangles over rounded everything
- Border-based card elevation over heavy shadows
- A "lo-fi" version that reads well > a "polished" version that overwhelms

If a screen looks busy, the answer is usually to remove an element, not add a divider.
