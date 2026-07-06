# 🎯 Feature spec template

Paste this into the body of a new Features database entry. Don't skip sections — if a section is "not applicable," write "N/A" so you know you considered it.

---

## One-sentence summary

*If you can't summarize the feature in one sentence, it's not ready to spec yet.*

> Example: "A 5-step onboarding wizard that walks a new provider from signup through their first published service, blocking dashboard access until complete."

---

## Why we're building it

*The problem this solves. Use real numbers or quotes from providers if possible.*

- Problem: 
- Current workaround: 
- Cost of not building it: 

---

## Who it's for

- [ ] Provider
- [ ] Client
- [ ] Admin / internal
- [ ] All

---

## Scope — what's in

*The bullet list of capabilities. Be specific. Be ruthless.*

- 
- 
- 

## Scope — what's out

*Things you might be tempted to include but shouldn't. Naming them protects against scope creep.*

- 
- 

---

## Design

### User flow

*Sketch the screens in words. Diagrams optional but appreciated.*

1. User lands on...
2. They see...
3. They click...
4. ...

### Visual register

*Confirm with the design system. Any new components needed?*

- New components: 
- Reuses existing: 
- Brand tone: (confident, short, no exclamation, etc. — usually default)

### Edge cases / empty states

- What happens when there's no data?
- What happens when the network fails?
- What happens on a 380px phone?

---

## Engineering

### Affected files / routes

- 
- 
- 

### Schema changes

*Any Prisma model changes? List them. Add a migration plan.*

- 

### API changes

*New endpoints? Modifications to existing ones? Be specific about request/response shape.*

- 

### Dependencies

- New packages: 
- New services: 
- New env vars: 

---

## Acceptance criteria

*Concrete, testable conditions. "It works" is not an acceptance criterion.*

- [ ] 
- [ ] 
- [ ] 

---

## Risks + open questions

*Things you're not sure about. List them so they're not silent.*

- 
- 

---

## Effort estimate

- Engineering: ___ hours
- Design: ___ hours  
- Testing: ___ hours
- **Total**: ___ hours

(Multiply your gut estimate by 1.5 for first-time features.)

---

## Status log

| Date | Status | Notes |
|---|---|---|
| | Idea | Initial drop-in |
| | Spec'd | Ready to build |
| | Building | Started |
| | Shipped | Live in prod |

---

## Post-ship retro

*Fill in after the feature ships and has been live for ~2 weeks.*

- What worked: 
- What I'd do differently: 
- Unexpected behavior in production: 
- Did it solve the problem? (yes / partially / no — with reason)
