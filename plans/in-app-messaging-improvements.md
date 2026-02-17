# Plan: In-App Messaging Improvements

## Summary
Enhance the existing Thread/Message system with real-time delivery, read receipts, typing indicators, image attachments, and pre-booking inquiry support. The messaging system already exists (Thread + Message models, `GET/POST /api/messages` endpoints) — this plan improves it to be a first-class communication channel between providers and clients.

## Existing Features This Touches
- **Thread model** — already exists; adding read tracking fields
- **Message model** — already exists; adding attachment support and message types
- **Provider Dashboard Messages page** — already exists; enhancing with real-time + attachments
- **Mobile app Messages tab** — scaffolded in both provider and client navigation

---

## Prisma Model Changes

### Modify existing Thread model — add fields:

```prisma
// Add to existing Thread model:
  lastMessageAt   DateTime?
  lastMessageText String?    @db.VarChar(500)
  providerRead    Boolean    @default(false)
  clientRead      Boolean    @default(false)
  status          ThreadStatus @default(ACTIVE)
```

### Modify existing Message model — add fields:

```prisma
// Add to existing Message model:
  type        MessageType @default(TEXT)
  attachments MessageAttachment[]
  readAt      DateTime?
  metadata    Json?       // e.g. { inquiryServiceId, inquiryDate }
```

### New models:

```prisma
model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  url       String   // Cloudflare R2 URL
  type      AttachmentType
  filename  String
  sizeBytes Int
  width     Int?     // for images
  height    Int?     // for images
  createdAt DateTime @default(now())

  @@index([messageId])
}

enum MessageType {
  TEXT
  IMAGE
  INQUIRY         // pre-booking question
  SYSTEM          // automated messages (booking confirmed, etc.)
}

enum AttachmentType {
  IMAGE
  VIDEO
}

enum ThreadStatus {
  ACTIVE
  ARCHIVED
  BLOCKED
}
```

### New model for real-time presence:

```prisma
model TypingIndicator {
  id        String   @id @default(cuid())
  threadId  String
  thread    Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime // auto-expire after 5 seconds

  @@unique([threadId, userId])
  @@index([threadId])
  @@index([expiresAt])
}
```

**Relations to add:**
```prisma
// In Thread model, add:
typingIndicators TypingIndicator[]

// In Message model, add:
attachments MessageAttachment[]

// In User model, add:
typingIndicators TypingIndicator[]
```

---

## New API Endpoints

### 1. List Threads (Enhanced)
- **URL:** `GET /api/messages/threads`
- **Auth:** Authenticated user (Clerk) — works for both providers and clients
- **Query params:** `?status=ACTIVE&limit=20&cursor=xxx`
- **Response (200):**
  ```json
  {
    "threads": [
      {
        "id": "cuid",
        "otherParty": {
          "id": "x",
          "name": "Jane's Nails",
          "profileImage": "url",
          "role": "PROVIDER"
        },
        "lastMessageText": "Thanks for confirming!",
        "lastMessageAt": "2025-02-15T14:30:00Z",
        "unread": true,
        "status": "ACTIVE"
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```
- **Logic:** Return threads where user is either client or provider. Determine `unread` based on `providerRead`/`clientRead` fields relative to the current user's role. Sort by `lastMessageAt DESC`.

### 2. Get Thread Messages (Enhanced)
- **URL:** `GET /api/messages/threads/:threadId`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Query params:** `?limit=50&cursor=xxx&before=datetime`
- **Response (200):**
  ```json
  {
    "thread": {
      "id": "cuid",
      "otherParty": { "id": "x", "name": "Jane's Nails", "profileImage": "url" },
      "status": "ACTIVE"
    },
    "messages": [
      {
        "id": "cuid",
        "senderId": "user_cuid",
        "senderName": "Alice",
        "type": "TEXT",
        "body": "Hi, do you have availability next week?",
        "attachments": [],
        "readAt": "2025-02-15T14:30:05Z",
        "createdAt": "2025-02-15T14:30:00Z"
      },
      {
        "id": "cuid",
        "senderId": "provider_user_cuid",
        "senderName": "Jane's Nails",
        "type": "IMAGE",
        "body": "Here's what that design looks like:",
        "attachments": [
          {
            "id": "cuid",
            "url": "https://r2.nailbook.app/messages/xxx.jpg",
            "type": "IMAGE",
            "filename": "design.jpg",
            "width": 1080,
            "height": 1080
          }
        ],
        "readAt": null,
        "createdAt": "2025-02-15T14:32:00Z"
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```
- **Logic:** Return messages for the thread, mark thread as read for current user. Paginate oldest-first with cursor.

### 3. Send Message (Enhanced)
- **URL:** `POST /api/messages/threads/:threadId`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Request:**
  ```json
  {
    "body": "Here's what that design looks like:",
    "type": "TEXT" | "IMAGE" | "INQUIRY",
    "attachmentIds": ["cuid"],
    "metadata": { "inquiryServiceId": "cuid", "inquiryDate": "2025-02-20" }
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "cuid",
    "body": "...",
    "type": "TEXT",
    "attachments": [...],
    "createdAt": "..."
  }
  ```
- **Validation:**
  ```typescript
  const sendMessageSchema = z.object({
    body: z.string().min(1).max(2000),
    type: z.enum(["TEXT", "IMAGE", "INQUIRY"]).default("TEXT"),
    attachmentIds: z.array(z.string()).max(5).default([]),
    metadata: z.object({
      inquiryServiceId: z.string().optional(),
      inquiryDate: z.string().optional(),
    }).optional(),
  });
  ```
- **Logic:** Create message, update thread's `lastMessageText`, `lastMessageAt`, and set other party's read flag to `false`. If type is INQUIRY, include service/date context in metadata.

### 4. Upload Message Attachment
- **URL:** `POST /api/messages/attachments`
- **Auth:** Authenticated user (Clerk)
- **Request:** `multipart/form-data` with `file` field
- **Response (201):**
  ```json
  {
    "id": "cuid",
    "url": "https://r2.nailbook.app/messages/xxx.jpg",
    "type": "IMAGE",
    "filename": "design.jpg",
    "sizeBytes": 245000,
    "width": 1080,
    "height": 1080
  }
  ```
- **Logic:** Upload to Cloudflare R2 under `messages/` prefix. Validate file type (images only for V1: jpg, png, webp). Max size 10MB. Return attachment metadata. Attachment is "orphaned" until attached to a message via `POST /api/messages/threads/:threadId`.

### 5. Start New Thread (Pre-booking Inquiry)
- **URL:** `POST /api/messages/threads`
- **Auth:** Authenticated client (Clerk)
- **Request:**
  ```json
  {
    "providerId": "cuid",
    "body": "Hi! Do you have availability for gel nails next week?",
    "type": "INQUIRY",
    "metadata": { "inquiryServiceId": "cuid" }
  }
  ```
- **Response (201):**
  ```json
  {
    "thread": { "id": "cuid", ... },
    "message": { "id": "cuid", ... }
  }
  ```
- **Logic:** Check if active thread already exists between client and provider. If yes, just add the message to existing thread. If no, create new Thread + first Message.

### 6. Mark Thread Read
- **URL:** `PATCH /api/messages/threads/:threadId/read`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Response (200):**
  ```json
  { "success": true }
  ```
- **Logic:** Set `providerRead` or `clientRead` to `true` based on current user's role. Also bulk-update `readAt` on all unread messages from the other party.

### 7. Typing Indicator
- **URL:** `POST /api/messages/threads/:threadId/typing`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Response (200):**
  ```json
  { "success": true }
  ```
- **Logic:** Upsert TypingIndicator with `expiresAt = now() + 5 seconds`. Client polls this (see below).

### 8. Get Typing Status
- **URL:** `GET /api/messages/threads/:threadId/typing`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Response (200):**
  ```json
  {
    "typing": [
      { "userId": "cuid", "name": "Jane" }
    ]
  }
  ```
- **Logic:** Return TypingIndicators where `expiresAt > now()` and `userId != current user`.

### 9. Archive Thread
- **URL:** `PATCH /api/messages/threads/:threadId`
- **Auth:** Authenticated user (Clerk, must be participant)
- **Request:**
  ```json
  { "status": "ARCHIVED" }
  ```
- **Response (200):** Updated thread

### 10. Unread Count
- **URL:** `GET /api/messages/unread-count`
- **Auth:** Authenticated user (Clerk)
- **Response (200):**
  ```json
  { "count": 3 }
  ```
- **Logic:** Count threads where the user's read flag is `false` and `status = ACTIVE`.

---

## New / Modified Pages

### Web (Next.js App Router — `apps/web/app/`)

| Path | Type | Description |
|------|------|-------------|
| `app/dashboard/messages/page.tsx` | **Client component** (existing — ENHANCE) | Split view: thread list on left, active conversation on right. Add: attachment support, read receipts (checkmarks), typing indicator, unread badges. Inquiry messages highlighted with service context. |
| `app/dashboard/messages/[threadId]/page.tsx` | **Client component** (may already exist — ENHANCE or CREATE) | Mobile-friendly single-thread view for narrow screens. |

### Mobile (Expo — `apps/mobile/src/`)

| Screen | Path | Description |
|--------|------|-------------|
| Thread List | `screens/shared/MessagesScreen.tsx` | Used by BOTH provider and client tabs. Thread list with avatar, name, last message preview, time, unread dot. |
| Thread Detail | `screens/shared/ThreadDetailScreen.tsx` | Chat bubbles UI. Send text + attach image. Show typing indicator. Mark as read on open. Inquiry messages have special card layout showing service info. |
| New Inquiry | `screens/client/NewInquiryScreen.tsx` | Client initiates conversation with a provider. Pre-fills service context if coming from a provider profile. |

---

## Real-Time Strategy (V1 — Polling)

For V1, use **short polling** instead of WebSockets to keep complexity low:

- **Thread list:** Poll `GET /api/messages/threads` every 10 seconds when on messages screen.
- **Active conversation:** Poll `GET /api/messages/threads/:threadId` every 3 seconds when chat is open.
- **Typing indicator:** Client sends `POST .../typing` every 3 seconds while user is typing. Poll `GET .../typing` every 2 seconds to display indicator.
- **Unread count:** Poll `GET /api/messages/unread-count` every 30 seconds for badge on Messages tab.

V2 can upgrade to Server-Sent Events or WebSockets.

---

## Worker Changes (`apps/worker/`)

### New: Message notification job
- **Job name:** `send-message-notification`
- **Trigger:** Enqueue when a new message is created and recipient is NOT currently viewing the thread (heuristic: if thread was last polled > 30 seconds ago)
- **Logic:** Send push notification (if PushToken exists) and/or email (using MessageTemplate for messages). Don't send if recipient has read the message within 30 seconds (they're actively in the chat).

### New: Typing indicator cleanup job
- **Job name:** `cleanup-typing-indicators`
- **Schedule:** Every 1 minute
- **Logic:** `DELETE FROM TypingIndicator WHERE expiresAt < now()`. Lightweight cleanup.

---

## Shared Package Changes (`packages/shared/`)

```typescript
// src/validators/message.ts
export const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  type: z.enum(["TEXT", "IMAGE", "INQUIRY"]).default("TEXT"),
  attachmentIds: z.array(z.string()).max(5).default([]),
  metadata: z.object({
    inquiryServiceId: z.string().optional(),
    inquiryDate: z.string().optional(),
  }).optional(),
});

export const startThreadSchema = z.object({
  providerId: z.string().min(1),
  body: z.string().min(1).max(2000),
  type: z.enum(["TEXT", "INQUIRY"]).default("TEXT"),
  metadata: z.object({
    inquiryServiceId: z.string().optional(),
    inquiryDate: z.string().optional(),
  }).optional(),
});

export const updateThreadSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

// src/types/message.ts
export type MessageType = "TEXT" | "IMAGE" | "INQUIRY" | "SYSTEM";
export type AttachmentType = "IMAGE" | "VIDEO";
export type ThreadStatus = "ACTIVE" | "ARCHIVED" | "BLOCKED";
```

---

## Acceptance Criteria

### Thread Management
- [ ] `GET /api/messages/threads` returns threads sorted by last message time
- [ ] Each thread shows `unread` status based on current user's role
- [ ] `POST /api/messages/threads` creates a new thread (or appends to existing)
- [ ] `PATCH /api/messages/threads/:threadId` archives/unarchives threads
- [ ] `PATCH /api/messages/threads/:threadId/read` marks thread as read
- [ ] `GET /api/messages/unread-count` returns accurate count

### Messages
- [ ] `GET /api/messages/threads/:threadId` returns paginated messages
- [ ] Opening a thread marks it as read for current user
- [ ] `POST /api/messages/threads/:threadId` sends a message
- [ ] Message delivery updates thread's `lastMessageText` and `lastMessageAt`
- [ ] Sending a message sets other party's read flag to false
- [ ] `readAt` timestamp is set on messages when other party reads them

### Attachments
- [ ] `POST /api/messages/attachments` uploads image to R2 and returns metadata
- [ ] File type validation (jpg, png, webp only)
- [ ] File size limit (10MB max)
- [ ] Attachments can be included in messages via `attachmentIds`
- [ ] Attachment images render in chat UI

### Typing Indicators
- [ ] `POST .../typing` creates/updates typing indicator with 5-second expiry
- [ ] `GET .../typing` returns active typing users (excluding current user)
- [ ] Expired indicators are cleaned up by worker job

### Inquiry Messages
- [ ] Inquiry type messages display with service context card
- [ ] Client can start inquiry from provider profile with pre-filled service
- [ ] Provider sees inquiry messages highlighted differently in thread

### Notifications
- [ ] New messages trigger push notification to recipient (if not actively viewing thread)
- [ ] Notification shows sender name and message preview

### UI — Web Dashboard
- [ ] Split view: thread list + active conversation
- [ ] Unread threads have bold text / dot indicator
- [ ] Typing indicator shows "Jane is typing..." animation
- [ ] Read receipts show as checkmarks on sent messages
- [ ] Image attachments render inline with lightbox on click

### UI — Mobile
- [ ] Thread list shows on Messages tab with unread badges
- [ ] Chat view has proper bubble layout (sent = right, received = left)
- [ ] Can attach and send images
- [ ] Typing indicator animates (three dots)
- [ ] Unread count badge shows on Messages tab icon

### Cross-cutting
- [ ] `prisma validate` passes
- [ ] `tsc --noEmit` passes across all packages
- [ ] New Zod schemas in `@nailbook/shared`
- [ ] All endpoints require authentication
- [ ] Users can only access threads they're participants in

---

## Validation Commands

```bash
# Schema validation
cd packages/db && npx prisma validate

# Generate client
pnpm db:generate

# Type check
pnpm tsc --noEmit

# Dev server
pnpm dev

# Test endpoints
curl http://localhost:3000/api/messages/threads  # Expect 401
curl http://localhost:3000/api/messages/unread-count  # Expect 401

curl -X POST http://localhost:3000/api/messages/threads \
  -H "Content-Type: application/json" \
  -d '{"providerId":"test","body":"test"}' \
  # Expect 401

# Verify dashboard messages page renders
# Navigate to /dashboard/messages — should show enhanced messaging UI

# Mobile
cd apps/mobile && npx expo start
# Both provider and client Messages tabs should render
```

---

## Notes for Agents
- **The Thread and Message models already exist.** You are ADDING fields, not creating new models. Be careful with the migration — use `prisma migrate dev` to generate the migration that adds the new fields.
- **Attachment upload uses the same Cloudflare R2 setup** as portfolio media (MediaAsset). Use the same S3-compatible client with a different key prefix (`messages/` instead of `portfolio/`).
- **Polling is intentional for V1.** Do not add WebSocket/SSE infrastructure. The polling intervals are specified above — follow them exactly.
- **Thread read tracking is role-based** — `providerRead` and `clientRead` are separate booleans. When the provider reads the thread, set `providerRead = true`. This avoids the complexity of tracking per-message read status while still enabling unread badges.
- **Per-message `readAt`** is a bonus for read receipts in the UI but the primary unread tracking is at the thread level.
- **System messages** (type `SYSTEM`) are created by the server, not users. Example: when an appointment is confirmed, the server can auto-create a system message in the thread. Don't build this in V1 — just define the type so it's available.
