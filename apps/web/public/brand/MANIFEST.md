# PoroBook brand asset manifest

Single source of truth for every image in `apps/web/public/brand/`. All files are 4K JPEGs generated via Nano Banana 2 Pro (`gemini-3-pro-image-preview`). Cost is roughly **$0.26 per image** at 4K Pro — see the table below before regenerating anything.

When pulling an image into a page, **read the Notes column first**. The wrong asset in the wrong context breaks the editorial register the SKILL is trying to enforce.

## Quick reference

| File | Category | Usage | Aspect | Notes |
|---|---|---|---|---|
| `editorial-hands-marble.jpeg` | Hands detail | Landing page wide hero, "About the craft" section header, service-category band | 16:9 | Two hands flat on Carrara marble, tortoiseshell + rust nail art, gold pinkie ring, cream silk cuff. Hero sweet spot. Avoid as a small thumbnail — detail collapses. Don't overlay heavy text on the centered hands; use the cream wall on the left for any caption. |
| `editorial-hands-marble-02.jpeg` | Hands detail | Alternate wide hero, style-gallery section, provider profile cover when no real photo exists | 16:9 | Hands stacked at the edge of a round marble table, marbled-swirl cream-rust nails that echo the marble, gauzy curtain in soft focus. More compositional movement than `-marble`. Use when you need negative space on the left for an overlaid headline. |
| `editorial-hands-cup.jpeg` | Hands lifestyle | Mobile hero, portrait card on landing, confirmation page success state | 4:5 | Two hands cradling a cream stoneware mug, dried pampas grass behind, oversized cream cable-knit, golden-hour rim light. Outdoor / late-afternoon mood. Pair with reflective copy ("Booked. Take a moment."). Avoid next to high-energy CTAs — tonally contemplative. |
| `editorial-hands-cup-02.jpeg` | Hands lifestyle | Café/at-home register card, "Discover" feature tile, service-detail hero for a specific manicure | 4:5 | Hands cradling a two-tone cream-and-rust stoneware cup (literally the brand palette), short oval gold-leaf nails, cream waffle-knit, woven striped throw, warm wood paneling. Indoor cozy register. Strong as a thumbnail because the cup mirrors the palette. |
| `editorial-portrait-salon.jpeg` | Portrait | "Become a Provider" landing hero, About page, brand-story sections | 3:2 | Mature sitter in cream silk on a rust velvet armchair, ornate gilded mirrors, anthurium and ficus, window light from the right. Reads "established / experienced / craft." Use for provider-side surfaces only; will feel mismatched on client-side. Don't tight-crop — the environment is part of the photograph. |
| `editorial-portrait-salon-young.jpeg` | Portrait | Client-side landing hero, signup flow, testimonial blocks | 3:2 | Mid-twenties sitter in rust knit on a cream bouclé tub chair, monstera and apothecary product shelf, daylight from the left. Less formal than `-salon` (mature). Use on client-targeted surfaces; alternate with the mature portrait so client and provider flows have age-appropriate imagery. |
| `editorial-portrait-lashes.jpeg` | Beauty close-up | Lash-extensions service tile, brow / wax / spa categories, vertical hero for a wellness section | 4:5 | Eyes closed in a calm half-smile, sleek slicked-back braid, dramatic lashes, glossy lip, cream-and-rust color-blocked cardigan, golden-hour rim. Strong for service-detail pages where the *result* is the subject. Avoid as a generic hero — closed eyes signal a specific service moment, not a lifestyle moment. |
| `editorial-salon-interior.jpeg` | Interior | Salon search-results header, "Find a salon near you" section, backdrop for booking-flow steps | 16:9 | Empty modern salon: arched windows, rust velvet swivel chairs, terrazzo floor, brass mirror surrounds, fiddle-leaf fig. No people — this is the aspirational "imagine yourself here" shot. Strong as an ambient backdrop, weak as a hero for personal-service messaging because there's no human focal point. |
| `editorial-leaving-salon.jpeg` | Lifestyle | Booking-confirmation success state, "After your appointment" emails, referral / share screens | 4:5 | Solo sitter caught mid-stride at a glass storefront, cream cable-knit + rust trousers, candid open-mouth laugh, phone in hand with fresh long nails visible. The "I look insane and I know it" moment — the emotional payoff of a successful booking. Doorway has no signage so it works in any context. Don't tight-crop the sidewalk; the wide step matters. |
| `beauty-macro-lash-eye.jpeg` | Beauty close-up | Service grid tiles (square format), social-media exports, lash-extensions detail card | 1:1 | True macro of a single eye with volume lash extensions, soft downward gaze, dewy skin with visible texture and warm freckling. Best square asset in the set. Don't blow up large — the aesthetic is a detail crop, not a hero. Pair with other 1:1 details in a service-category grid. |
| `editorial-mirror-selfie.jpeg` | Lifestyle | Social-share / referral surfaces, onboarding "share your salon find" screen, IG-export tiles | 4:5 | Sitter mid-laugh raising her phone to a gold-framed mirror, long box braids, black ribbed tee, long stiletto cream-rust nails visible in both hands. Two stylists working in soft focus behind. "Gen Z, friends in the cut" register. Pair with copy about sharing, social, community. Avoid for mature-sitter contexts. |
| `editorial-mirror-selfie-02.jpeg` | Lifestyle | Standalone profile / influencer-positioning surfaces, "Show off your work" provider feature | 4:5 | Brighter midday register with floor-to-ceiling windows, hanging pothos, olive utility shirt (the one wardrobe break from cream/rust). Both hands clearly showing French-tip-with-gold nail work. Standalone glamour energy versus the friends-in-cut energy of selfie #1. Use when the subject is *the sitter*, not the social moment. |

## Conventions across the set

- **Subjects.** Every photograph features Black women, per SKILL. No stock-style imagery, no white-default casting.
- **Palette.** Cream surfaces (`#FBF8F3` family) plus rust accents (`#C4732A` family) plus warm-gold side light. The single permitted wardrobe break in the set is the olive utility shirt in `mirror-selfie-02` — useful as a fashion-forward signal, not a default.
- **Light.** Golden-hour or warm window light from the side (right or left, not flat front-on). No fluorescent, no blue-cool, no overhead-noon.
- **No signage in any frame.** This was hard-won — see the "Generation tips" section below.
- **No phone-screen UI, no logos, no watermarks, no text.**
- **No emoji or illustration.** Per SKILL: imagery is photographic only. Empty states get illustrations, hero / lifestyle surfaces get this set.

## Pairing rules

- **One photograph per surface.** Don't stack two of these in the same view; the editorial register depends on a single dominant image.
- **Crop conservatively.** These are composed for their native aspect ratio. Recropping `4:5` to `16:9` will hurt the composition every time.
- **Mature vs. young portrait.** Pick one per flow. Mixing `editorial-portrait-salon` (mature) and `editorial-portrait-salon-young` (mid-20s) in the same hero / signup / about block reads as inconsistent.
- **Hero vs. tile.** The two `marble` shots and the `salon-interior` are heroes — full-bleed only. The `cup`, `lashes`, `mirror-selfie` series, and `leaving-salon` work both as heroes and as portrait cards. The `macro-lash-eye` is a tile, never a hero.
- **Next.js Image.** Always pull these through `next/image`. Raw 4K JPEGs are 5–9 MB; the optimizer resizes per breakpoint. Set `priority` only on the above-the-fold hero of a given page.

## Generation tips (for future Nano Banana 2 prompts)

- **Avoid "leaving / inside / arriving at a [place]" phrasing.** The model treats place nouns as a context cue and renders signage. Replace with neutral location descriptors ("sunlit sidewalk," "warm interior with cream walls," "stone garden wall") and add `no shopfronts, no signage, no awning, no text, no logos` to the negative list.
- **Specify wardrobe explicitly.** "Cream silk blouse and rust knit cardigan" beats "warm cream and rust tones" every time. The model anchors palette through wardrobe more reliably than through ambient cues.
- **Lock the lens.** "Shot on 85mm at f1.8" or "medium format film" produces cleaner shallow-depth results than "magazine quality" alone.
- **Aspect ratio in the prompt and the flag.** Both. The flag controls the canvas; the textual mention reinforces the framing.
- **Default to Pro at 4K.** Free tier doesn't include image gen at all; on the paid tier, Pro is ~$0.26 per 4K image and the quality margin over Flash is meaningful for editorial work.

## Naming convention

`{intent}-{subject}-{detail}.jpeg`

- `intent` — `editorial` (most cases) or `beauty` (extreme close-ups, macro detail).
- `subject` — `hands`, `portrait`, `mirror-selfie`, `leaving`, `salon-interior`, `macro-lash-eye`.
- `detail` — short qualifier when needed (`marble`, `cup`, `young`, `salon`).
- `-02` suffix for alternate takes of the same composition.

When generating new assets, follow this convention and add a row to the table above before merging.

## Cost log

Session through 2026-04-26: 14 generations, ~$3.61 total. 12 kept, 2 discarded after review (`editorial-leaving-duo` × 2 — both takes felt off-palette / off-vibe). Full per-generation history lives in `~/.nano-banana/costs.json`.
