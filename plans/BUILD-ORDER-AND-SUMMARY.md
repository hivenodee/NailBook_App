# NailBook V1 Agent Plans — Summary & Build Order

## Recommended Build Sequence

Build these in order. Each plan is independent but later plans benefit from earlier ones.

### 1. 🔔 Push Notifications & Email Reminders
**File:** `plans/push-notifications-email-reminders.md`
**Why first:** Adds `PushToken` model that the mobile app needs for token registration. Gets the notification infrastructure in place before mobile features ship.
**New models:** PushToken, NotificationLog, ReminderSetting (+3 enums)
**New endpoints:** 5
**New pages:** 2 web dashboard pages
**Agent count:** 2-3 (schema agent + API/worker agent + optional dashboard UI agent)

### 2. 💬 In-App Messaging Improvements
**File:** `plans/in-app-messaging-improvements.md`
**Why second:** Enhances existing Thread/Message models that both mobile plans depend on. Better to have the improved messaging system in place before building mobile chat UIs.
**Modified models:** Thread, Message (+3 new: MessageAttachment, TypingIndicator + 3 enums)
**New endpoints:** 10
**Modified pages:** 1 web dashboard page (enhance existing)
**Agent count:** 2-3 (schema agent + API agent + UI agent)

### 3. 📱 Mobile App Provider Features
**File:** `plans/mobile-provider-features.md`
**Why third:** Provider mobile app is the core product — providers need to manage bookings on the go. No new models needed; all existing API endpoints.
**New models:** 0
**New endpoints:** 1 (share link helper)
**New screens:** 10+ React Native screens
**Agent count:** 3 (navigation/shell agent + screen agent + API client agent)

### 4. 📱 Mobile App Client Features
**File:** `plans/mobile-client-features.md`
**Why fourth:** Client mobile experience builds on the improved messaging from plan 2 and shares components with the provider mobile app from plan 3.
**New models:** SearchHistory
**New endpoints:** 6
**New screens:** 10+ React Native screens
**Agent count:** 3 (navigation/shell agent + screen agent + API/booking flow agent)

### 5. 🔍 Client Discovery Feed
**File:** `plans/client-discovery-feed.md`
**Why last:** The feed needs content (provider portfolio items) and clients (from plans 3 & 4) to be meaningful. Also adds the most new models.
**New models:** FeedItem, FeedLike (+2 enums)
**New endpoints:** 7
**New pages:** 2 web pages + 2 mobile screens
**Agent count:** 3 (schema agent + API agent + UI agent for both web + mobile)

---

## Total New Infrastructure

| Category | Count |
|----------|-------|
| New Prisma models | 8 (PushToken, NotificationLog, ReminderSetting, SearchHistory, FeedItem, FeedLike, MessageAttachment, TypingIndicator) |
| Modified Prisma models | 2 (Thread, Message — adding fields) |
| New enums | 8 (Platform, NotificationChannel, NotificationStatus, MessageType, AttachmentType, ThreadStatus, plus existing ones reused) |
| New API endpoints | ~29 |
| New/modified web pages | 5 |
| New mobile screens | 20+ |
| New worker jobs | 5 (push receipts, notification retry, message notifications, typing cleanup, view count) |

---

## Pre-Flight Checklist Before Running Any Plan

```bash
# 1. Ensure repo is clean
cd ~/Documents/nailbook_app/nailbook
git status  # should be clean

# 2. Verify CLAUDE.md and FEATURES.md are committed
git log --oneline -5

# 3. Copy plan files into the repo
cp ~/Downloads/push-notifications-email-reminders.md plans/
cp ~/Downloads/in-app-messaging-improvements.md plans/
cp ~/Downloads/mobile-provider-features.md plans/
cp ~/Downloads/mobile-client-features.md plans/
cp ~/Downloads/client-discovery-feed.md plans/

# 4. Commit plans
git add plans/
git commit -m "Add V1 agent team plans"

# 5. Run first plan
claude
# then: /build-with-agent-team plans/push-notifications-email-reminders.md 3
```

---

## After Each Plan Completes

```bash
# 1. Review changes
git diff

# 2. Run validation
pnpm tsc --noEmit
cd packages/db && npx prisma validate
pnpm dev  # verify it starts

# 3. Commit
git add -A && git commit -m "Add [feature name]"
git push

# 4. Update FEATURES.md
# Ask Claude to update FEATURES.md with the new features

# 5. Move to next plan
```
