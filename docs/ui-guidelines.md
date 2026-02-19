# NailBook UI Guidelines

This file defines non-negotiable UI/UX rules for NailBook.
Any UI implementation must follow these principles. If a UI decision conflicts with these principles, the decision is wrong.

---

## 1. Positioning

NailBook is **THE girls app** for women's self-care service providers (nails, lashes, hair, esthetics). Think of it as the women's equivalent of "The Cut" for men. The aesthetic is **quiet luxury** -- premium, calm, trustworthy, warm.

NailBook should feel like walking into a thoughtfully designed nail studio: warm ambient lighting, clean surfaces, natural materials, everything in its place.

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
| `background` | `#F8F6F1` | Page background (warm linen) |
| `surface` | `#FFFFFF` | Cards, inputs, modals |
| `surface-alt` | `#F3EDE6` | Alternating sections, hover backgrounds |
| `border` | `#E5DFD6` | All borders (warm sand) |
| `text-primary` | `#2A2522` | Headlines, body text (rich charcoal) |
| `text-secondary` | `#6D6560` | Supporting text |
| `text-muted` | `#9E958C` | Timestamps, captions (taupe) |
| `primary` | `#7B8B6A` | Buttons, links, active states (warm sage) |
| `primary-hover` | `#667A55` | Button hover (deep sage) |
| `primary-light` | `#E6EBE1` | Badges, subtle backgrounds (sage tint) |
| `accent` | `#C4A08A` | Premium highlights, icons (rose gold) |
| `accent-light` | `#F0E6DD` | Accent backgrounds (rose mist) |
| `status-success` | `#6B8F5C` | Confirmed states (fern) |
| `status-warning` | `#C9993A` | Pending states (amber gold) |
| `status-error` | `#BF6B6B` | Errors, cancellations (dusty rose) |
| `status-info` | `#7A94AA` | Informational states (slate blue) |

**Rules:**
- Never use raw Tailwind grays (`bg-gray-100`, `text-gray-600`). Use tokens.
- Accent color should be < 15% of any screen.
- No neon colors. No pure black backgrounds.
- Status colors use soft tones (`-50` weight feel, not `-100/-800`).

### Typography

| Role | Font | Class | Usage |
|------|------|-------|-------|
| Display / Page titles | DM Serif Display | `font-display text-3xl` | Page headings |
| Section headers | DM Serif Display | `font-display text-2xl` | Section titles |
| Provider names | DM Serif Display | `font-display text-2xl` | Business names on profiles |
| Prices | DM Serif Display | `font-display text-xl` | Service prices, totals |
| Subheadings | Inter | `text-lg font-semibold` | Card group labels |
| Body | Inter | `text-base` | Paragraphs, descriptions |
| Small body | Inter | `text-sm` | Secondary info |
| Caption / meta | Inter | `text-xs text-text-muted` | Timestamps, counts |
| Buttons | Inter | `text-sm font-medium tracking-wide` | All button text |

**Rules:**
- DM Serif Display is for display only: titles, names, prices, section headers.
- Never use DM Serif Display for long paragraphs, form labels, or navigation.
- Inter is the workhorse: body, buttons, labels, badges, nav, forms.
- Button text always uses `tracking-wide` for a refined feel.

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
| `rounded-full` | 9999px | Badges, avatars, pills |

---

## 5. Component Standards

### Cards

- **Elevation**: Border-based, not shadow-based. Use `border border-border/50` for resting state.
- **Shadow**: Only on hover: `hover:shadow-soft`.
- **Hover**: Gentle lift: `hover:-translate-y-0.5 transition-all duration-200`.
- **Padding**: `p-grid-2` for dashboard, `p-grid-3` for public pages.
- **Active/featured**: Left accent border `border-l-3 border-l-primary`.
- **One primary action per card.**

```
Standard card:
bg-surface rounded-card p-grid-2 border border-border/50
  hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200
```

### Buttons

- **Primary**: `bg-primary text-white rounded-button px-6 py-3 min-h-[44px] font-medium text-sm tracking-wide hover:bg-primary-hover active:scale-[0.98] transition-all`
- **Secondary**: `bg-transparent border border-border text-text-primary rounded-button px-6 py-3 min-h-[44px] font-medium text-sm tracking-wide hover:bg-surface-alt transition-colors`
- **Text/Tertiary**: `text-primary font-medium text-sm hover:text-primary-hover underline-offset-2 hover:underline`
- **Destructive**: `bg-transparent border border-status-error/30 text-status-error rounded-button px-6 py-3 min-h-[44px] font-medium text-sm hover:bg-status-error/5 transition-colors`. **Never a filled red button.**
- **Disabled**: `opacity-50 cursor-not-allowed`. Use `bg-border text-text-muted` for permanently disabled states.
- **All buttons**: minimum 44px touch target height (`min-h-[44px]`).
- **One primary button per screen.** Secondary actions are text buttons or outlined.

### Badges / Status Pills

- Status badges: `text-xs font-medium px-2.5 py-0.5 rounded-full` with soft color pairs.
- Use status token colors from `status-colors.ts`, never inline raw colors.
- Nav badges: small dots (6px circles, `w-1.5 h-1.5 rounded-full bg-primary`), not number pills.

### Navigation

- Active indicator: subtle underline/border (`border-b-2 border-primary`), **not** a filled background pill.
- Inactive: `text-text-muted hover:text-text-secondary`.
- NailBook wordmark in the nav uses `font-display`.
- Dashboard nav: horizontally scrollable, `scrollbar-hide`.

### Modals & Bottom Sheets

- Bottom sheets preferred over full modals.
- Must have a clear exit (X button or swipe-down).
- No modal stacks (never open a modal from a modal).
- Scrim: `bg-black/40` (not heavy).

### Skeleton Loaders

- **Shimmer gradient**, not pulse. Use the `skeleton-shimmer` utility class.
- Skeleton shapes should match the final content (circles for avatars, pills for badges, bars for text).
- Delay 200ms before showing to avoid flash on fast loads.
- Cross-fade from skeleton to real content when loaded.

### Empty States

- "No data yet" (never had data): Dashed border card with warm, encouraging copy.
  - `rounded-card border-2 border-dashed border-border p-grid-4 text-center`
  - Include a line-art SVG icon (not emoji).
  - Warm copy: "Your portfolio is waiting for its first masterpiece" not "No photos yet."
  - Single CTA button for the next action.
- "No results for filter": Solid card, muted message, suggest clearing filters.

---

## 6. Motion & Animation

All motion is **subtle and purposeful**. The vibe is "smooth and assured," not "fun and quirky."

| Animation | CSS | When to use |
|-----------|-----|-------------|
| Page entrance | `animate-fade-in-up` (fade + 10px upward slide, 300ms ease-out) | Page content containers |
| Card list stagger | 50ms delay per item, fade-in | Lists of cards loading |
| Button press | `active:scale-[0.98]` | All interactive buttons |
| Hover lift | `hover:-translate-y-0.5 transition-all duration-200` | Cards, clickable items |
| Skeleton shimmer | `skeleton-shimmer` (gradient sweep, 1.5s loop) | All loading states |
| Toggle switch | Smooth thumb slide, 200ms | Enable/disable switches |
| Status change | Color transition over 300ms | Badge color updates |
| Sticky header | Shadow appears on scroll | Nav bars |

**Do NOT use:**
- Bounce animations
- Confetti or fireworks
- Spring physics
- Animations longer than 400ms
- Page-level slide transitions (use fade only)

---

## 7. Booking Flow Rules

- Step-based flow (service > time > details > confirm > pay).
- Deposit amount shown on every step if required.
- Policies summarized in plain language.
- No surprise totals at checkout.
- Apple Pay / Google Pay first when available.
- Progress indicator at the top.

---

## 8. Messaging Rules

- Chat UI mirrors iMessage familiarity.
- System messages are labeled "NailBook".
- Automated reminders never impersonate users.
- No marketing messages inside chat threads.

---

## 9. Money & Trust UI

- Ledger-first design. Transaction list is the source of truth.
- Status states must always be visible (pending, completed, failed, refunded).
- Payout progress clearly labeled.
- No hidden transaction behavior.
- Human support path always accessible.
- All prices displayed in cents converted to dollars: `(cents / 100).toFixed(2)`.

---

## 10. Provider Profile (Public Page)

The provider profile is a **landing page**, not a dashboard. Structure:

```
[Cover image - full width, 200px, gradient overlay at bottom]
[Avatar - 80px circle, overlapping cover by 40px, border-4 border-surface]
[Business name - font-display, centered]
[Location + social links - text-muted, centered]
[Verified badge - if applicable]
[Trust row: rating + review count + "Next available" date]

---

[Portfolio - 3-column grid, tight gaps, Instagram-style]

---

[Reviews summary card - if reviews exist]

---

[Services - stacked cards with serif prices + Book buttons]

---

[Policies - small text, muted]
```

---

## 11. Do / Don't

### Do
- Use warm, neutral backgrounds (#F8F6F1 linen)
- Use serif headings for elegance (DM Serif Display)
- Use border-based card elevation
- Use generous whitespace (30-40% more than you think)
- Use 16px+ border radius
- Use subtle, barely-there shadows
- Use soft status colors (green-50/green-700 feel)
- Keep one primary CTA per screen
- Cross-fade between loading and loaded states
- Use line-art SVG icons (Lucide style)

### Don't
- Use neon or saturated primary colors
- Use pure black backgrounds
- Use heavy drop shadows or neumorphism
- Use filled red destructive buttons (outline only)
- Use glassmorphism or frosted glass
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
