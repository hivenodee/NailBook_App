---
name: porobook-design
description: Use whenever designing or building UI for PoroBook — covers brand voice, color rules, typography, component patterns, motion, and what to avoid.
---

# PoroBook Design System

## Brand
PoroBook is an editorial-grade booking platform for Black beauty 
professionals. The aesthetic is luxury salon, not utility SaaS. 
References: Aesop/patmcgrath/mytopicals/resy.com

## Voice in copy
Confident, never apologetic. Short sentences. No exclamation points 
unless celebrating. No corporate filler like "seamlessly", 
"leverage", "empower". No em dashes. Sentence case for UI labels.

## Color rules
Cream (#FBF8F3) for content surfaces. Rust orange (#C4732A) for 
primary actions and accents only. Never put body text on rust 
backgrounds. Near-black (#1A1614) for typography, never pure black. 
Whitespace is a feature.

## Typography rules
Playfair Display for headers, page titles, hero copy. Inter for body, 
UI, data. No more than 3 type sizes visible at once. Line height 1.5 
for body, 1.1 for display. Tight tracking on display, normal on body.

## Component rules
Buttons: pill or 8px radius, never sharp. Cards: 1px border in 
ink-200 instead of shadows. Drop shadows only on modals and dropdowns. 
Hover states: 1px lift and border darken. Focus rings: rust-500, 
2px offset.

## What we are not
Not Material Design. Not generic shadcn. Not Stripe gradients. Not 
bro-tech dashboard. No emoji as design. No stock photography.

## Imagery
All photographic imagery is generated via Nano Banana 2 and stored 
in apps/web/public/brand/. Editorial photography style: warm, soft 
natural light, real Black women. Empty states use illustrations, 
not just icons.

Before pulling any brand image into a page, read 
apps/web/public/brand/MANIFEST.md — it lists every available asset 
with the recommended usage, aspect ratio, and what to avoid for 
each. When generating new assets, follow the manifest's naming 
convention and add a row to its table.

### Asset library
- Filesystem path (for Read / Write / Edit): 
  `apps/web/public/brand/`
- URL path (for `src=` attributes and `next/image`): `/brand/`
- Source of truth: `apps/web/public/brand/MANIFEST.md` — always 
  check the manifest before choosing an image, and add a row to 
  it whenever you generate a new asset.
- The folder contains photographs only. For non-photographic 
  background treatments, see the Textures subsection below.

### Textures
Textures are CSS-generated via the `TextureBackground` component 
in `components/ui/`. Never use photographic texture files.

Variants and when to use each:
- `paper` — default for most surfaces. Use on long-form content 
  sections, marketing pages, anywhere that needs subtle warmth 
  instead of flat cream.
- `linen` — for card-heavy regions, modal backgrounds, the booking 
  flow steps. Reads more luxurious than paper.
- `marble` — for premium moments only. Provider profile hero, 
  confirmation screens, featured provider highlight.
- `rust` — for high-attention CTA sections only. Use sparingly. 
  Never as a default background.

Rules:
- One `TextureBackground` per page maximum, never stacked.
- Default intensity is `subtle` — only step up to medium or strong 
  if there's a specific design reason.
- Always test that headings and body text remain readable on top.
- Pass `disableOnMobile` if the texture causes any performance lag.

## Motion
Framer Motion. Page transitions: 300ms ease-out fade plus 8px slide 
up. Card hover: 200ms ease-out, 1px lift, border darken. Discovery 
feed: 50ms stagger reveal on scroll. No bouncy springs. No animations 
over 400ms.

## When generating components
Always reference colors from lib/design-tokens.ts. Never hardcode 
values. Always use semantic HTML. Always include focus states. 
Always test mobile at 380px. Default to fewer elements and more 
breathing room.
