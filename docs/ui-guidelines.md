# NailBook UI Guidelines

This file defines non-negotiable UI/UX rules for NailBook.
Any UI implementation must follow these principles.

---

## 1. UI Philosophy

- Mobile-first. Every screen must be usable with one hand.
- Portfolio-first. Images come before text, trust before price.
- Calm, minimal, non-bloated aesthetic.
- One primary action per screen.
- Money visibility at all times (no hidden fees or states).
- Progressive disclosure: advanced options only appear when enabled.
- Creator-first, not admin-first.
- No surprise interactions.

If a UI decision conflicts with these principles, the decision is wrong.

---

## 2. Visual Hierarchy Rules

- Images dominate where available (feeds, profiles).
- Text is secondary and concise.
- Pricing is visible but not aggressive.
- Policies are clear but not overwhelming.
- Avoid dense blocks of text.
- White/neutral space is intentional, not empty.

---

## 3. Color & Tone

- Neutral base UI (off-white, warm beige, soft taupe).
- Primary action color: muted sage/olive.
- Text: charcoal, not pure black.
- Accent colors (rose gold, lavender) <15% of UI.
- No neon colors.
- No pure black backgrounds in light mode.
- Dark mode (future): charcoal-based, not jet black.

---

## 4. Layout & Spacing

- 8pt spacing grid.
- Large, consistent corner radius on cards and modals.
- Soft shadows only (no heavy elevation).
- Bottom-tab navigation only.
- Primary CTAs live in thumb zone.

---

## 5. Navigation Rules

Client navigation:
- Feed
- Search
- Bookings
- Messages
- Profile

Provider navigation:
- Today
- Calendar
- Clients
- Money
- Profile

No extra tabs without explicit product approval.

---

## 6. Component Rules

### Cards
- Used for appointments, services, providers.
- One primary action per card.
- Status shown as subtle badge (not color overload).

### Buttons
- One primary button per screen.
- Secondary actions are text buttons.
- Destructive actions are visually distinct but not alarming.

### Modals & Sheets
- Bottom sheets preferred over full modals.
- Modals must have a clear exit.
- No modal stacks.

### Forms
- Toggles first, fields appear only after enabled.
- Defaults should be safe and sensible.
- Minimize typing; prefer pickers and chips.

---

## 7. Booking Flow Rules

- Step-based flow (service → time → confirm → pay).
- Deposit amount shown on every step if required.
- Policies summarized in plain language.
- No surprise totals at checkout.
- Apple Pay / Google Pay first when available.

---

## 8. Messaging Rules

- Chat UI mirrors iMessage familiarity.
- System messages are labeled “NailBook”.
- Automated reminders never impersonate users.
- No marketing messages inside chat threads.

---

## 9. Money & Trust UI

- Ledger-first design.
- Status states must always be visible.
- Payout progress clearly labeled.
- No hidden transaction behavior.
- Human support path always accessible.

---

## 10. Empty States & Feedback

- Empty states explain what to do next.
- Success feedback is calm and reassuring.
- No confetti, fireworks, or aggressive animations.
- Subtle haptics are allowed.

---

## 11. MVP Guardrails

For MVP:
- No advanced analytics graphs.
- No customization beyond profile accent colors.
- No feature-heavy dashboards.
- No experimental UI patterns.

Stability > novelty.

---

## 12. When in Doubt

If unsure:
- Choose clarity over cleverness.
- Choose calm over excitement.
- Choose trust over conversion hacks.
