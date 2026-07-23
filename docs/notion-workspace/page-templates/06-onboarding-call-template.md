# 📞 Beta Provider Onboarding Call

*Provider name:* | *Date:* | *Format: Zoom / In-person / Phone*

---

## Pre-call prep (5 min before)

- [ ] Their public page exists at `porobook.com/[their-slug]` (or localhost for early testing)
- [ ] Test account ready in Prisma Studio in case they need a manual fix mid-call
- [ ] Stripe Dashboard open in another tab
- [ ] Screen share + recording permission ready
- [ ] Their Instagram open so I can reference their existing portfolio

---

## During the call (30 min)

### 1. Welcome + context (3 min)

- Thank them for being one of the first
- Frame the goal: today we get their PoroBook page LIVE — services, hours, photo, booking link
- They get free use for 6 months
- I'll DM-check-in every Friday for the first month
- Any bug → reach me within 4 business hours

### 2. Signup + profile basics (5 min)

Walk through:
- [ ] Sign up via Clerk (their email, password)
- [ ] Land on dashboard
- [ ] **I manually flip `isVerified = true` in Prisma Studio during the call**
- [ ] Open `/dashboard/profile`
- [ ] Cover image upload (crop on the fly — use a recent IG post they like)
- [ ] Avatar upload
- [ ] Business name + bio + location + Instagram / TikTok links

### 3. First service (10 min)

- [ ] Open `/dashboard/services`
- [ ] Click "New service" — add their most popular offering
- [ ] Name, price, duration
- [ ] Deposit configuration (most providers want 25–50% deposit)
- [ ] Optional: add-on groups if they have variants (length, design complexity)
- [ ] Optional: 1–2 intake questions (allergies, inspiration photos)
- [ ] Save → confirm it shows on their public profile
- [ ] Add 2–3 more services together (faster once they've seen one)

### 4. Hours (3 min)

- [ ] Open `/dashboard/availability`
- [ ] Set weekly recurring hours
- [ ] Block any specific time-off in the next 2 weeks
- [ ] Confirm `bookingWindowDays` (default 30) feels right for them

### 5. Walk the public page together (5 min)

Open their public page in a new tab. They should react out loud.

- [ ] Does the cover photo feel like them?
- [ ] Is the avatar cropped right?
- [ ] Is the bio voice on-brand?
- [ ] Click through a fake booking — do they understand each step?
- [ ] On their phone — does it look right at 380px?

**Note any concerns. Don't dismiss — these are gold.**

### 6. The handoff (4 min)

- [ ] Share their booking link → they paste into their Instagram bio + TikTok bio + Linktree
- [ ] Show how to find their booking link in the dashboard ("Share" button on Today view)
- [ ] Show the Today view — this is where new bookings will show up
- [ ] Show the email they'll get when someone books
- [ ] Show how to mark complete / cancel / no-show
- [ ] Talk about the deposit flow (what they see, what client sees)

---

## End of call

- [ ] Confirm they have my number / email for issues
- [ ] Schedule the Friday check-in DM (just remind myself to do it)
- [ ] Add them to **🚀 Beta Providers** database:
  - Status = Onboarded
  - Onboarded date = today
  - Verified = checked
  - Last check-in = today
  - Notes = anything specific from the call

---

## Notes from this call

### What worked

- 

### What they asked about

- 

### What confused them

- 

### Bugs / issues surfaced

*(Move these to the Bugs database after the call.)*

- 

### Features they asked for

*(Move these to Ideas Inbox. Don't promise anything during the call.)*

- 

### Their existing client volume

*Helpful context for how fast they'll fill up the platform with real data.*

- Weekly appointments: ~ ___
- Average ticket: ~ $___
- Primary booking source today: (IG DM / Square / Acuity / GlossGenius / Other)

---

## 24-hour follow-up

The day after the call, send them:

- A thank-you DM / text
- A quick screen recording of the parts they seemed least comfortable with (e.g. how to view today's bookings, how to mark complete)
- A direct line for issues ("Text me 4am, doesn't matter")

---

## 7-day check-in

A week later, message them:

> "Heya! Quick check — how's the platform feeling so far? Any bookings come through? Anything breaking or confusing?"

Don't ask "do you have feedback" — ask specifically. People will say "no feedback" but will tell you the truth if you ask "is anything confusing?"

---

## 30-day retro

A month in, schedule a 15-min retro call:

- How many bookings completed?
- Any deposit issues?
- Any clients confused or refusing to use the platform?
- Are they planning to keep using it past the 6-month free period?
- Would they recommend to other beauty pros? (NPS question)
- What's the one thing that would make them recommend it?

This is the most important conversation you'll have with each provider. Record it (with permission).
