# Porobook UI Guidelines

This file defines non-negotiable UI/UX rules for Porobook.
Any UI implementation must follow these principles. If a UI decision conflicts with these principles, the decision is wrong.

---

## 1. Positioning & Design Philosophy

Porobook is **THE girls app** for women's self-care service providers (nails, lashes, hair, esthetics). Think of it as the women's equivalent of "The Cut" for men. The aesthetic is **quiet luxury** — premium, calm, trustworthy, warm.

**Design DNA:** GlossGenius x Apple x Instagram x Pinterest

Porobook should feel like walking into a thoughtfully designed nail studio: warm ambient lighting, clean surfaces, natural materials, everything in its place.

---

## 2. UI Philosophy

- **Mobile-first.** Every screen must be usable with one hand.
- **Portfolio-first.** Images come before text, trust before price.
- **Provider-first control.** The provider is the primary user; the dashboard must feel empowering, not admin-heavy.
- **Calm, minimal, non-bloated.** Generous whitespace. No visual clutter.
- **One primary action per screen.** Never compete for attention.
- **Money visibility at all times.** No hidden fees, states, or ambiguous totals.
- **Progressive disclosure.** Advanced options appear only when enabled (toggles reveal fields).
- **Trust + clarity > conversion hacks.** No dark patterns, no surprise modals.
- **No surprise interactions.**

---

## 3. Visual Hierarchy

- Images dominate where available (feeds, profiles, portfolio).
- Text is secondary and concise.
- Pricing is visible but not aggressive. Prices use the display serif font.
- Policies are clear but not overwhelming.
- White/neutral space is intentional, not empty.
- Avoid dense blocks of text.

---

## 4. Design Tokens

### Colors (Warm Earth Palette)

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FDFBF9` | Page background (warm linen) |
| `surface` | `#FFFFFF` | Cards, inputs, modals |
| `surface-alt` | `#F8F5F2` | Alternating sections, hover backgrounds |
| `border` | `#E8E2DC` | All borders (warm sand) |
| `text-primary` | `#2A2522` | Headlines, body text (rich charcoal) |
| `text-secondary` | `#6B5E54` | Supporting text |
| `text-muted` | `#A89888` | Timestamps, captions (taupe) |
| `primary` | `#E8A4A8` | Buttons, links, active states (dusty rose) |
| `primary-hover` | `#D98C91` | Button hover (deep rose) |
| `primary-light` | `#FDF0F1` | Badges, subtle backgrounds (rose mist) |
| `secondary` | `#7B8B6A` | Sage accents (sage green) |
| `secondary-hover` | `#667A55` | Deep sage |
| `secondary-light` | `#E6EBE1` | Sage tint |
| `accent` | `#D4A574` | Premium highlights, icons (warm gold) |
| `accent-light` | `#F0E6DD` | Accent backgrounds (rose mist) |
| `status-success` | `#7B8B6A` | Confirmed states (sage) |
| `status-warning` | `#D4A574` | Pending states (warm gold) |
| `status-error` | `#C4868B` | Errors, cancellations (dusty rose) |
| `status-info` | `#8BA5B5` | Informational states (slate blue) |

**Rules:**
- Never use raw Tailwind grays (`bg-gray-100`, `text-gray-600`). Use tokens.
- Accent color should be < 15% of any screen.
- No neon colors. No pure black backgrounds.
- Status colors use soft tones (`-50` weight feel, not `-100/-800`).

### Typography

| Role | Font | Class | Letter Spacing | Size |
|------|------|-------|----------------|------|
| Display XL | Playfair Display | `font-display text-4xl sm:text-5xl` | `-0.02em` | 36px+ |
| Display / Page titles | Playfair Display | `font-display text-3xl` | `-0.02em` | 30px |
| Section headers | Playfair Display | `font-display text-2xl` | `-0.01em` | 24px |
| Provider names | Playfair Display | `font-display text-2xl` | `-0.01em` | 24px |
| Prices | Playfair Display | `font-display text-xl` | `-0.01em` | 20px |
| Subheadings | Inter | `text-lg font-semibold` | `0em` | 18px |
| Body | Inter | `text-base` | `0em` | 16px |
| Small body | Inter | `text-sm` | `0em` | 14px |
| Caption / meta | Inter | `text-xs text-text-muted` | `0em` | 12px |
| Micro | Inter | `text-[10px]` | `0.04em` | 10px |
| Buttons | Inter | `text-sm font-medium tracking-wide` | — | 14px |

**Rules:**
- Playfair Display is for display only: titles, names, prices, section headers, the Porobook wordmark.
- Never use Playfair Display for long paragraphs, form labels, or navigation.
- Inter is the workhorse: body, buttons, labels, badges, nav, forms.
- Button text always uses `tracking-wide` for a refined feel.
- Display headings use `-0.02em` letter-spacing, headings use `-0.01em`, body uses `0em`, micro uses `0.04em`.

### Spacing

8pt grid system. Use `grid-1` (8px) through `grid-6` (48px) tokens.

- Dashboard cards: `p-grid-2` (16px)
- Public-facing cards: `p-grid-3` (24px)
- Section gaps: `space-y-grid-3` (24px)
- Inner element gaps: `gap-grid-1` (8px) or `gap-grid-2` (16px)

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-card` | 16px | Cards, modals, sheets |
| `rounded-button` | 12px | Buttons |
| `rounded-input` | 10px | Form inputs |
| `rounded-badge` | 20px | Status badges |
| `rounded-full` | 9999px | Avatars, pills, dots |
| `rounded-[12px]` | 12px | Nav items, interactive elements |

---

## 5. Component Standards

### Cards

- **Elevation**: Border-based, not shadow-based. Use `border border-border` for resting state.
- **Shadow**: Only on hover: `hover:shadow-card`.
- **Hover**: Gentle lift: `hover:-translate-y-[2px] transition-all duration-200`.
- **Padding**: `p-grid-2` for dashboard, `p-grid-3` for public pages.
- **Active/featured**: Left accent border `border-l-4 border-l-primary`.
- **Selected**: `border-2 border-primary shadow-soft`.
- **One primary action per card.**

```
Standard card:
bg-surface rounded-card p-grid-2 border border-border
  hover:shadow-card hover:-translate-y-[2px] transition-all duration-200

Image card (portfolio/explore):
aspect-[3/4] rounded-[12px] overflow-hidden
  with gradient overlay at bottom for text
```

### Appointment Cards

- 4px gradient left border (primary→secondary) indicating status
- Client avatar circle (40px, initials fallback with gradient bg)
- "New Client" sparkle badge: `bg-primary-light text-primary rounded-full`
- Price in `font-display text-lg text-primary`
- Status chip: `rounded-full` pill shape

### Stat Cards

- Gradient variant using `gradient-rose-sage` background
- Large number in `font-display text-2xl`
- Subtle label in `text-xs text-text-muted`

### Buttons

- **Primary**: `bg-primary text-white rounded-button px-6 py-3 min-h-[44px] font-medium text-sm tracking-wide hover:bg-primary-hover active:scale-[0.97] transition-all`
- **Secondary**: `bg-transparent border border-border text-text-primary rounded-button px-6 py-3 min-h-[44px] font-medium text-sm tracking-wide hover:bg-surface-alt transition-colors`
- **Text/Tertiary**: `text-primary font-medium text-sm hover:text-primary-hover underline-offset-2 hover:underline`
- **Destructive**: `bg-transparent border border-status-error/30 text-status-error rounded-button px-6 py-3 min-h-[44px] font-medium text-sm hover:bg-status-error/5 transition-colors`. **Never a filled red button.**
- **Disabled**: `opacity-50 cursor-not-allowed`. Use `bg-border text-text-muted` for permanently disabled states.
- **All buttons**: minimum 44px touch target height (`min-h-[44px]`).
- **One primary button per screen.** Secondary actions are text buttons or outlined.
- **Press feedback**: `active:scale-[0.97]` or use `.btn-press` class.

### Badges / Status Pills

- Status badges: `text-xs font-medium px-2.5 py-0.5 rounded-full` with soft color pairs.
- Use status token colors from `status-colors.ts`, never inline raw colors.
- Nav badges: small dots (6px circles, `w-1.5 h-1.5 rounded-full bg-primary`), not number pills.

### Sidebar Navigation

**Desktop (240px width):**
- Glass header: `bg-white/80 backdrop-blur-xl` with subtle border below
- Active state: Left accent bar `border-l-[3px] border-l-primary` + `bg-primary-light/20`
- Hover: `hover:translate-x-[2px]` subtle shift
- Section spacing: `mb-grid-3` (24px) between sections
- Items: `rounded-[12px]`

**Mobile Bottom Tab Bar:**
- `backdrop-blur-xl`, `bg-surface/90`
- Badge dots: `animate-scale-pop` on appearance
- Active indicator: thin underline bar

**"More" Sheet:**
- Animation: `animate-slide-up`
- Scrim: `bg-black/40 backdrop-blur-sm`
- Badge: 6px dot indicators (not number pills)

### Modals & Bottom Sheets

- Bottom sheets preferred over full modals.
- Must have a clear exit (X button or swipe-down).
- No modal stacks (never open a modal from a modal).
- Scrim: `bg-black/40 backdrop-blur-sm` (not heavy).

### Skeleton Loaders

- **Shimmer gradient**, not pulse. Use the `skeleton-shimmer` utility class.
- Skeleton shapes should match the final content (circles for avatars, pills for badges, bars for text).
- Delay 200ms before showing to avoid flash on fast loads.
- Cross-fade from skeleton to real content when loaded.

### Empty States

- **"No data yet" (never had data):**
  - Large gradient circle (120px) with 48px icon inside
  - Display font heading (`font-display text-xl`)
  - Description in `text-text-secondary`, max-width 280px centered
  - Primary CTA button
  - Dashed border card: `rounded-card border-2 border-dashed border-border p-grid-4 text-center`
  - Warm copy: "Your portfolio is waiting for its first masterpiece" not "No photos yet."

- **"No results for filter":**
  - Solid card, muted message, suggest clearing filters.

### Icon System

| Context | Size | Circle BG |
|---------|------|-----------|
| Nav icons | 18px | None |
| Feature icons | 24px | 48px circle background |
| Inline icons | 14px | None |
| Empty state icons | 48px | 120px gradient circle |

- Primary actions: `text-primary`
- Secondary: `text-text-muted`

---

## 6. Motion & Animation

All motion is **subtle and purposeful**. The vibe is "smooth and assured," not "fun and quirky."

| Animation | CSS | Curve | When to use |
|-----------|-----|-------|-------------|
| Page entrance | `animate-fade-in-up` | ease-out 300ms | Page content containers |
| Slide up (sheets) | `animate-slide-up` | cubic-bezier(0.16, 1, 0.3, 1) 350ms | Bottom sheets, menus |
| Scale pop | `animate-scale-pop` | cubic-bezier(0.34, 1.56, 0.64, 1) 300ms | Badge appearance, success icons |
| Fade in | `animate-fade-in` | ease-out 200ms | Overlays, scrims |
| Card list stagger | 50ms delay per item | ease-out | Lists of cards loading |
| Button press | `active:scale-[0.97]` | — | All interactive buttons |
| Hover lift | `hover:-translate-y-[2px] transition-all duration-200` | — | Cards, clickable items |
| Skeleton shimmer | `skeleton-shimmer` | ease-in-out 1.5s loop | All loading states |
| Toggle switch | Smooth thumb slide | 200ms | Enable/disable switches |
| Status change | Color transition | 300ms | Badge color updates |
| Sticky header | Shadow appears on scroll | — | Nav bars |

**Reduced motion:** All animations respect `@media (prefers-reduced-motion: reduce)` — durations collapse to 0.01ms.

**Do NOT use:**
- Bounce animations
- Confetti or fireworks
- Spring physics
- Animations longer than 400ms
- Page-level slide transitions (use fade only)

---

## 7. Page Layouts

### Dashboard Home Screen

- Time-based greeting ("Good morning/afternoon/evening")
- Quick stats row: 3 gradient stat cards (today's bookings, week revenue, new clients)
- "Next Up" prominent appointment card
- Quick actions grid (4 items)

### Creator/Provider Profile (Public Page)

The provider profile is a **landing page**, not a dashboard. Structure:

```
[Cover image - full width, 220px, gradient overlay at bottom]
[Avatar - 80px circle, overlapping cover by 40px, border-4 border-surface]
  - Verified ring: ring-2 ring-primary ring-offset-2
[Business name - font-display, centered]
[Location + social links - text-muted, centered]
[Verified badge - if applicable]
[Stats row: services count | reviews count]
[Trust row: rating + review count + "Next available" date]

---

[Portfolio - 3-column grid, tight gaps, Instagram-style]

---

[Reviews summary card - if reviews exist]

---

[Services - stacked cards with serif prices + Book buttons]

---

[Policies - small text, muted]

[Floating "Book Now" CTA - mobile only, fixed bottom]
```

### Discovery/Explore Feed

- Full-bleed gradient hero with frosted-glass search bar
- "Discover Beauty Near You" display heading
- Category chips: `rounded-full` pill shape
- Provider cards: 3:4 aspect ratio image cards with gradient overlay
- Optional masonry grid layout (CSS `columns: 2` mobile, `columns: 3` desktop)
- "Near You" horizontal scroll section when location enabled

---

## 8. Booking Flow Rules

- Step-based flow (service > time > details > confirm > pay).
- Visual progress stepper with checkmarks for completed steps.
- Floating summary bar (sticky bottom with service name, price, Continue button).
- Deposit amount shown on every step if required.
- Policies summarized in plain language.
- No surprise totals at checkout.
- Apple Pay / Google Pay first when available.

---

## 9. Messaging Rules

- Chat UI mirrors iMessage familiarity.
- System messages are labeled "Porobook".
- Automated reminders never impersonate users.
- No marketing messages inside chat threads.

---

## 10. Money & Trust UI

- Ledger-first design. Transaction list is the source of truth.
- Status states must always be visible (pending, completed, failed, refunded).
- Payout progress clearly labeled.
- No hidden transaction behavior.
- Human support path always accessible.
- All prices displayed in cents converted to dollars: `(cents / 100).toFixed(2)`.

---

## 11. Do / Don't

### Do
- Use warm, neutral backgrounds (#FDFBF9 linen)
- Use serif headings for elegance (Playfair Display)
- Use border-based card elevation
- Use generous whitespace (30-40% more than you think)
- Use 16px+ border radius
- Use subtle, barely-there shadows
- Use soft status colors (sage-50/sage-700 feel)
- Keep one primary CTA per screen
- Cross-fade between loading and loaded states
- Use line-art SVG icons (Lucide style)
- Use subtle frosted glass on fixed navigation elements only (sidebar header, mobile tab bar)
- Use `active:scale-[0.97]` press feedback on buttons

### Don't
- Use neon or saturated primary colors
- Use pure black backgrounds
- Use heavy drop shadows or neumorphism
- Use filled red destructive buttons (outline only)
- Use glassmorphism on content areas (only subtle on fixed nav)
- Use flat illustration mascots or 3D renders
- Use emoji as UI elements
- Use bounce or spring animations
- Use confetti, fireworks, or aggressive celebration
- Use multiple competing accent colors
- Stack modals
- Hide money states

---

## 12. When in Doubt

- Choose clarity over cleverness.
- Choose calm over excitement.
- Choose trust over conversion hacks.
- Choose warmth over sterility.
- Ask: "Would this feel right in a luxury nail studio?"

---

## 13. Deferred Features

**Inspiration Board System** — Requires `InspirationBoard` and `InspirationPin` database models. Deferred to post-V1.
