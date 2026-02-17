# Plan: Push Notifications & Email Reminders

## Summary
Add push notification support (Expo Notifications) and enhance the existing email/SMS reminder system with reliable delivery tracking, retry logic, and provider-configurable reminder schedules. The worker already has BullMQ jobs for reminders — this plan adds the push notification channel, delivery tracking, and the provider UI to configure reminder timing.

## Existing Features This Touches
- **Communication System** — 9 MessageTemplate types already exist; we're adding push as a delivery channel
- **Background Worker** — BullMQ jobs for appointment reminders (24h, 2h) already exist; we're adding push delivery + tracking
- **Appointment model** — no changes to the model itself, but reminders reference appointments
- **Provider profile** — adding reminder settings to provider preferences
- **Mobile app** — adding Expo push token registration on login

---

## New Prisma Models

Add to `packages/db/prisma/schema.prisma`:

```prisma
model PushToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  platform  Platform
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([token])
}

enum Platform {
  IOS
  ANDROID
  WEB
}

model NotificationLog {
  id            String              @id @default(cuid())
  recipientId   String
  recipient     User                @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  appointmentId String?
  appointment   Appointment?        @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  templateType  MessageTemplateType
  channel       NotificationChannel
  status        NotificationStatus  @default(PENDING)
  title         String?
  body          String
  metadata      Json?               // e.g. { expoTicketId, messageId, error }
  sentAt        DateTime?
  deliveredAt   DateTime?
  failedAt      DateTime?
  retryCount    Int                 @default(0)
  createdAt     DateTime            @default(now())

  @@index([recipientId])
  @@index([appointmentId])
  @@index([status])
  @@index([createdAt])
}

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  SKIPPED
}

model ReminderSetting {
  id         String   @id @default(cuid())
  providerId String
  provider   Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  hoursBefore Int     // e.g. 24, 2, 48
  channels   NotificationChannel[] // e.g. [EMAIL, PUSH]
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([providerId, hoursBefore])
  @@index([providerId])
}
```

**Relations to add to existing models:**

```prisma
// In User model, add:
pushTokens       PushToken[]
notificationLogs NotificationLog[]

// In Appointment model, add:
notificationLogs NotificationLog[]

// In Provider model, add:
reminderSettings ReminderSetting[]
```

---

## New API Endpoints

All endpoints follow existing patterns: Next.js API route handlers in `apps/web/app/api/`, Clerk auth via `auth()`, Zod validation, standard JSON responses.

### 1. Register Push Token
- **URL:** `POST /api/push-tokens`
- **Auth:** Authenticated user (Clerk)
- **Request:**
  ```json
  {
    "token": "ExponentPushToken[xxxxx]",
    "platform": "IOS" | "ANDROID" | "WEB"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "cuid",
    "token": "ExponentPushToken[xxxxx]",
    "platform": "IOS",
    "active": true
  }
  ```
- **Validation:** Zod schema in `@nailbook/shared`
  ```typescript
  const registerPushTokenSchema = z.object({
    token: z.string().min(1),
    platform: z.enum(["IOS", "ANDROID", "WEB"]),
  });
  ```
- **Logic:** Upsert — if token exists for this user, update `active: true`. If token exists for different user, reassign it (device changed hands).

### 2. Deactivate Push Token
- **URL:** `DELETE /api/push-tokens`
- **Auth:** Authenticated user (Clerk)
- **Request:**
  ```json
  { "token": "ExponentPushToken[xxxxx]" }
  ```
- **Response (200):**
  ```json
  { "success": true }
  ```
- **Logic:** Set `active: false` (soft delete for audit trail).

### 3. Get Reminder Settings
- **URL:** `GET /api/reminders/settings`
- **Auth:** Provider (Clerk + provider check)
- **Response (200):**
  ```json
  {
    "settings": [
      {
        "id": "cuid",
        "hoursBefore": 24,
        "channels": ["EMAIL", "PUSH"],
        "enabled": true
      },
      {
        "id": "cuid",
        "hoursBefore": 2,
        "channels": ["EMAIL", "SMS", "PUSH"],
        "enabled": true
      }
    ]
  }
  ```
- **Logic:** Return all ReminderSettings for the provider. If none exist, return defaults: `[{hoursBefore: 24, channels: ["EMAIL"], enabled: true}, {hoursBefore: 2, channels: ["EMAIL", "SMS"], enabled: true}]`.

### 4. Update Reminder Settings
- **URL:** `PUT /api/reminders/settings`
- **Auth:** Provider (Clerk + provider check)
- **Request:**
  ```json
  {
    "settings": [
      { "hoursBefore": 24, "channels": ["EMAIL", "PUSH"], "enabled": true },
      { "hoursBefore": 2, "channels": ["EMAIL", "SMS", "PUSH"], "enabled": true },
      { "hoursBefore": 48, "channels": ["EMAIL"], "enabled": false }
    ]
  }
  ```
- **Response (200):**
  ```json
  { "settings": [ /* updated settings */ ] }
  ```
- **Validation:**
  ```typescript
  const updateReminderSettingsSchema = z.object({
    settings: z.array(z.object({
      hoursBefore: z.number().int().min(1).max(168), // 1h to 7 days
      channels: z.array(z.enum(["EMAIL", "SMS", "PUSH"])).min(1),
      enabled: z.boolean(),
    })).min(1).max(5),
  });
  ```
- **Logic:** Upsert all settings in a transaction. Delete any existing settings not in the new array.

### 5. Get Notification History
- **URL:** `GET /api/notifications`
- **Auth:** Provider (Clerk + provider check)
- **Query params:** `?appointmentId=xxx&status=SENT&limit=20&cursor=xxx`
- **Response (200):**
  ```json
  {
    "notifications": [
      {
        "id": "cuid",
        "templateType": "REMINDER",
        "channel": "PUSH",
        "status": "DELIVERED",
        "title": "Appointment Reminder",
        "body": "Your nail appointment is tomorrow at 2:00 PM",
        "sentAt": "2025-01-15T10:00:00Z",
        "deliveredAt": "2025-01-15T10:00:02Z"
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```

---

## New Pages

### Web (Next.js App Router — `apps/web/app/`)

| Path | Type | Description |
|------|------|-------------|
| `app/dashboard/reminders/page.tsx` | **Client component** | Provider reminder settings UI — toggle channels per reminder interval, add/remove intervals. Uses `PUT /api/reminders/settings`. |
| `app/dashboard/notifications/page.tsx` | **Server component** with client interactive parts | Notification delivery log — table of sent notifications with status badges, filterable by type and status. |

### Mobile (Expo — `apps/mobile/`)

No new screens. Changes are inline:
- **App root / auth flow:** Register push token after Clerk auth succeeds.
- **Settings tab:** Add toggle for push notification opt-in/out.

---

## Worker Changes (`apps/worker/`)

### Modify existing reminder job
The existing BullMQ reminder job currently sends email/SMS. Update it to:

1. Look up `ReminderSetting` for the provider at the appropriate `hoursBefore` interval.
2. For each enabled channel in the setting, dispatch to the appropriate sender.
3. For `PUSH` channel: look up active `PushToken` records for the client user, call Expo Push API.
4. Log every attempt to `NotificationLog` with status tracking.

### New: Push delivery receipt checker job
- **Job name:** `check-push-receipts`
- **Schedule:** Every 5 minutes via BullMQ repeatable job
- **Logic:** Query `NotificationLog` where `channel = PUSH` and `status = SENT` and `sentAt > now() - 24h`. Batch-check receipts via Expo Push API. Update status to `DELIVERED` or `FAILED`.

### New: Notification retry job
- **Job name:** `retry-failed-notifications`
- **Schedule:** Every 15 minutes
- **Logic:** Query `NotificationLog` where `status = FAILED` and `retryCount < 3` and `createdAt > now() - 24h`. Retry delivery. Increment `retryCount`.

---

## Shared Package Changes (`packages/shared/`)

Add to validators:
```typescript
// src/validators/push-token.ts
export const registerPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
});

// src/validators/reminder-settings.ts
export const updateReminderSettingsSchema = z.object({
  settings: z.array(z.object({
    hoursBefore: z.number().int().min(1).max(168),
    channels: z.array(z.enum(["EMAIL", "SMS", "PUSH"])).min(1),
    enabled: z.boolean(),
  })).min(1).max(5),
});
```

Add to types:
```typescript
// src/types/notification.ts
export type NotificationChannel = "EMAIL" | "SMS" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
```

---

## Acceptance Criteria

- [ ] `PushToken`, `NotificationLog`, and `ReminderSetting` models exist in schema and `pnpm db:generate` succeeds
- [ ] `prisma validate` passes with no errors
- [ ] `POST /api/push-tokens` registers a token and returns 201
- [ ] `DELETE /api/push-tokens` deactivates a token and returns 200
- [ ] `GET /api/reminders/settings` returns default settings when none exist
- [ ] `PUT /api/reminders/settings` upserts settings and returns updated list
- [ ] `GET /api/notifications` returns paginated notification logs
- [ ] Dashboard reminder settings page renders and allows toggling channels
- [ ] Dashboard notification history page renders with status badges
- [ ] Mobile app registers push token on successful Clerk auth
- [ ] Worker reminder job checks `ReminderSetting` and dispatches to enabled channels
- [ ] Worker creates `NotificationLog` entry for every notification attempt
- [ ] Push delivery receipt checker job runs and updates statuses
- [ ] Failed notification retry job respects `retryCount < 3` limit
- [ ] All new endpoints require Clerk authentication (except none are public)
- [ ] All new Zod schemas are in `@nailbook/shared`
- [ ] `tsc --noEmit` passes across all packages
- [ ] No existing tests break

---

## Validation Commands

```bash
# Schema validation
cd packages/db && npx prisma validate

# Type checking (all packages)
pnpm tsc --noEmit

# Generate Prisma client
pnpm db:generate

# Dev server starts without errors
pnpm dev

# Verify new API routes exist and respond
curl -X POST http://localhost:3000/api/push-tokens \
  -H "Content-Type: application/json" \
  -d '{"token":"test","platform":"IOS"}' \
  # Expect 401 (no auth) — confirms route exists

curl http://localhost:3000/api/reminders/settings \
  # Expect 401 — confirms route exists

curl http://localhost:3000/api/notifications \
  # Expect 401 — confirms route exists

# Verify dashboard pages render
# Navigate to /dashboard/reminders — should show settings UI
# Navigate to /dashboard/notifications — should show log table
```

---

## Dependencies to Install

```bash
# In apps/worker or apps/web (wherever push sending lives)
pnpm add expo-server-sdk
# In apps/mobile
# expo-notifications should already be available via Expo 52
```

---

## Notes for Agents
- Follow existing lazy initialization pattern for Expo push client (see how Stripe/Resend/Twilio are initialized in the codebase — getter pattern to avoid build-time failures).
- NotificationLog is an **append-only audit log** — never update the `body` or `templateType` after creation, only update `status`, `sentAt`, `deliveredAt`, `failedAt`, `retryCount`.
- The existing `MessageTemplate` system handles variable substitution with `{{variable}}` — reuse that for push notification body content.
- All provider data is scoped by `providerId` — reminder settings are per-provider.
- Use existing rate limiting middleware for any public endpoints (none in this plan, but keep the pattern).
