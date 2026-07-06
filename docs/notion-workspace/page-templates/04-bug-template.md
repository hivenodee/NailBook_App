# 🐛 Bug template

Paste this into the body of a new Bugs database entry. Fill in inline.

---

## What happened

*Describe what you saw, in 1–2 sentences. Plain English.*

> Example: When I rescheduled an appointment from the email link, I got "no times available" briefly before the actual slots showed up.

## What you expected

*What should have happened?*

> Example: Slots should show "Loading times…" until the fetch returns, never "no times available" before the request completes.

## Steps to reproduce

1. 
2. 
3. 

## Where

- **Page / area:** (e.g. Reschedule modal on `/[slug]/manage/[id]`)
- **Component / file:** (if known — e.g. `components/booking/StepTime.tsx`)
- **Browser / device:** (e.g. iPhone Safari, Mac Chrome)

## Severity

- [ ] **🔴 Blocker** — would prevent a beta provider from accepting bookings. Fix today.
- [ ] **🟡 Bug** — works but wrong. Affects experience but doesn't break the flow. Fix this sprint.
- [ ] **🟢 Nit** — cosmetic or edge case. Triage at next Weekly Review.

## Screenshots / video

*Drag images right into Notion. Or paste URLs.*

- 

## Console errors

```
(Paste any DevTools console output)
```

## Network tab observations

*If network request failed: paste URL, status code, response body.*

- URL: 
- Status: 
- Response: 

## Notes / hypothesis

*Your best guess at the cause. Helps the future-you (or Claude) debug faster.*

- 

---

## Fix log (after resolved)

- **Fixed in commit:** (paste git SHA)
- **Fixed on date:** 
- **Root cause:** 
- **Verified by:** (incognito retest? Real device test?)
