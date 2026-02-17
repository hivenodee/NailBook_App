# Plan: Client Discovery Feed

## Summary
Build the discovery feed — a social-media-style scrollable feed where clients discover nail technicians through portfolio content. This is the "Feed" tab in the client mobile app and a new `/discover` page on the web. Think Instagram Explore for nails: a grid/feed of portfolio images and videos from providers, with the ability to tap through to the provider's profile and book.

## Existing Features This Touches
- **MediaAsset model** — portfolio photos/videos already uploaded by providers to Cloudflare R2
- **Provider model** — profile data, services, ratings
- **FavoriteProvider model** — clients can favorite from the feed
- **Public Booking Flow** — tapping "Book" from the feed goes to the existing booking flow

---

## New Prisma Models

```prisma
model FeedItem {
  id          String       @id @default(cuid())
  providerId  String
  provider    Provider     @relation(fields: [providerId], references: [id], onDelete: Cascade)
  mediaAssetId String
  mediaAsset  MediaAsset   @relation(fields: [mediaAssetId], references: [id], onDelete: Cascade)
  caption     String?      @db.VarChar(500)
  tags        String[]     // e.g. ["gel", "french-tip", "nail-art", "acrylic"]
  serviceId   String?      // optional link to a specific service
  service     Service?     @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  likeCount   Int          @default(0)
  viewCount   Int          @default(0)
  featured    Boolean      @default(false)
  active      Boolean      @default(true)
  publishedAt DateTime     @default(now())
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  likes       FeedLike[]

  @@index([providerId])
  @@index([publishedAt])
  @@index([tags])
  @@index([featured, publishedAt])
  @@index([active, publishedAt])
}

model FeedLike {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feedItemId String
  feedItem   FeedItem @relation(fields: [feedItemId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([userId, feedItemId])
  @@index([feedItemId])
  @@index([userId])
}
```

**Relations to add to existing models:**

```prisma
// In Provider model, add:
feedItems FeedItem[]

// In MediaAsset model, add:
feedItem FeedItem?

// In Service model, add:
feedItems FeedItem[]

// In User model, add:
feedLikes FeedLike[]
```

---

## New API Endpoints

### 1. Get Discovery Feed
- **URL:** `GET /api/feed`
- **Auth:** Public (rate-limited, standard tier: 60 req/min)
- **Query params:** `?tag=gel&limit=20&cursor=xxx&featured=true`
- **Response (200):**
  ```json
  {
    "items": [
      {
        "id": "cuid",
        "provider": {
          "id": "x",
          "businessName": "Jane's Nails",
          "slug": "janesnails",
          "profileImage": "url",
          "rating": 4.8
        },
        "media": {
          "url": "https://r2.nailbook.app/media/xxx.jpg",
          "type": "IMAGE",
          "width": 1080,
          "height": 1080
        },
        "caption": "Summer French tips 🌸",
        "tags": ["french-tip", "summer"],
        "service": { "name": "Gel Manicure", "price": 4500 } | null,
        "likeCount": 42,
        "liked": false,
        "publishedAt": "2025-02-15T10:00:00Z"
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```
- **Logic:**
  - Default sort: recent + engagement weighted (mix of recency and likeCount)
  - If `tag` provided, filter by tag (case-insensitive, array contains)
  - If `featured=true`, only show featured items
  - If authenticated, include `liked: true/false` per item
  - Only return items where `active = true`
  - Increment `viewCount` async (fire-and-forget, don't block response)

### 2. Like a Feed Item
- **URL:** `POST /api/feed/:id/like`
- **Auth:** Authenticated client (Clerk)
- **Response (200):**
  ```json
  { "liked": true, "likeCount": 43 }
  ```
- **Logic:** Create FeedLike record. Increment `likeCount` on FeedItem. Idempotent — if already liked, return current state.

### 3. Unlike a Feed Item
- **URL:** `DELETE /api/feed/:id/like`
- **Auth:** Authenticated client (Clerk)
- **Response (200):**
  ```json
  { "liked": false, "likeCount": 42 }
  ```
- **Logic:** Delete FeedLike record. Decrement `likeCount`. Idempotent.

### 4. Create Feed Item (Provider)
- **URL:** `POST /api/feed`
- **Auth:** Provider (Clerk + provider check)
- **Request:**
  ```json
  {
    "mediaAssetId": "cuid",
    "caption": "Summer French tips 🌸",
    "tags": ["french-tip", "summer", "gel"],
    "serviceId": "cuid_or_null"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "cuid",
    "mediaAssetId": "cuid",
    "caption": "Summer French tips 🌸",
    "tags": ["french-tip", "summer", "gel"],
    "publishedAt": "..."
  }
  ```
- **Validation:**
  ```typescript
  const createFeedItemSchema = z.object({
    mediaAssetId: z.string().cuid(),
    caption: z.string().max(500).optional(),
    tags: z.array(z.string().min(1).max(30).regex(/^[a-z0-9-]+$/)).max(10).default([]),
    serviceId: z.string().cuid().nullish(),
  });
  ```
- **Logic:** Verify mediaAssetId belongs to provider. Create FeedItem. Tags are lowercase, hyphenated.

### 5. Manage Feed Items (Provider)
- **URL:** `GET /api/feed/mine`
- **Auth:** Provider (Clerk + provider check)
- **Response (200):**
  ```json
  {
    "items": [
      {
        "id": "cuid",
        "media": { "url": "...", "type": "IMAGE" },
        "caption": "...",
        "tags": [...],
        "likeCount": 42,
        "viewCount": 150,
        "active": true,
        "publishedAt": "..."
      }
    ]
  }
  ```

### 6. Update/Deactivate Feed Item
- **URL:** `PATCH /api/feed/:id`
- **Auth:** Provider (Clerk + provider check, must own the item)
- **Request:**
  ```json
  {
    "caption": "Updated caption",
    "tags": ["updated-tags"],
    "active": false
  }
  ```
- **Response (200):** Updated feed item

### 7. Get Trending Tags
- **URL:** `GET /api/feed/tags`
- **Auth:** Public (rate-limited)
- **Response (200):**
  ```json
  {
    "tags": [
      { "name": "gel", "count": 234 },
      { "name": "french-tip", "count": 189 },
      { "name": "nail-art", "count": 156 },
      { "name": "acrylic", "count": 134 }
    ]
  }
  ```
- **Logic:** Aggregate tags from active FeedItems, sorted by frequency. Cache with Redis (5-min TTL) if available.

---

## New Pages

### Web (Next.js App Router — `apps/web/app/`)

| Path | Type | Description |
|------|------|-------------|
| `app/discover/page.tsx` | **Server component** (initial data fetch) + client interactive grid | Public discovery page. Masonry grid of feed items. Tag filter chips at top. Click item → modal with larger image + provider info + "Book" button. |
| `app/discover/loading.tsx` | **Server component** | Loading skeleton for discover page |
| `app/dashboard/feed/page.tsx` | **Client component** | Provider dashboard page to manage feed items — see their published items, create new ones from existing portfolio, edit captions/tags, deactivate items. |

### Mobile (Expo — `apps/mobile/src/`)

The Feed tab screen already exists in the navigation scaffolding. Build:

| Screen | Path | Description |
|--------|------|-------------|
| Feed | `screens/client/FeedScreen.tsx` | Vertical scrollable feed (Instagram-style). Each item: image, provider info bar, caption, like button, "Book" shortcut. Pull-to-refresh. Infinite scroll. Tag filter at top. |
| Feed Item Detail | `screens/client/FeedItemDetailScreen.tsx` | Full-screen image/video. Provider info, caption, tags. "View Profile" and "Book Now" buttons. Like button. |

---

## Acceptance Criteria

### Public Feed
- [ ] `GET /api/feed` returns paginated feed items sorted by recency + engagement
- [ ] Feed items include provider info, media URL, caption, tags, like count
- [ ] Tag filtering works: `?tag=gel` returns only items with that tag
- [ ] `?featured=true` returns only featured items
- [ ] Authenticated requests include `liked` boolean per item
- [ ] View counts increment asynchronously on feed load
- [ ] Rate limiting applies (60 req/min standard tier)

### Likes
- [ ] `POST /api/feed/:id/like` creates like and increments count
- [ ] `DELETE /api/feed/:id/like` removes like and decrements count
- [ ] Both endpoints are idempotent
- [ ] Like/unlike requires authentication

### Provider Feed Management
- [ ] `POST /api/feed` creates a feed item from an existing portfolio media asset
- [ ] Validation ensures mediaAssetId belongs to the authenticated provider
- [ ] Tags are normalized to lowercase-hyphenated format
- [ ] `GET /api/feed/mine` returns only the provider's own items with view/like stats
- [ ] `PATCH /api/feed/:id` updates caption, tags, or active status
- [ ] Deactivating a feed item removes it from the public feed

### Trending Tags
- [ ] `GET /api/feed/tags` returns tags sorted by frequency
- [ ] Response is cached (Redis) for 5 minutes if Redis is available
- [ ] Gracefully falls back to direct DB query if Redis unavailable

### Web Discover Page
- [ ] `/discover` renders a masonry grid of feed items
- [ ] Tag filter chips at top, clicking a chip filters the grid
- [ ] Clicking an item opens a modal with larger image, provider info, "Book" button
- [ ] "Book" button links to `/:slug/book`
- [ ] Page is SSR for SEO (initial data fetched server-side)
- [ ] Infinite scroll loads more items

### Mobile Feed
- [ ] Feed tab shows vertical scrollable feed of items
- [ ] Each item shows image, provider bar (avatar + name), caption, like button
- [ ] Double-tap to like (like Instagram)
- [ ] Tapping provider bar navigates to ProviderProfileScreen
- [ ] "Book" button navigates to BookingFlowScreen
- [ ] Tag filter pills at top of feed
- [ ] Pull-to-refresh and infinite scroll work

### Provider Dashboard Feed Page
- [ ] Dashboard shows all provider's feed items with stats (views, likes)
- [ ] "Publish to Feed" button shows portfolio picker → creates feed item
- [ ] Can edit caption and tags inline
- [ ] Can deactivate/reactivate items

### Cross-cutting
- [ ] `prisma validate` passes
- [ ] `tsc --noEmit` passes across all packages
- [ ] New Zod schemas in `@nailbook/shared`
- [ ] Feed items respect provider's `active` status (inactive providers' items hidden)

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

# Test feed endpoints
curl http://localhost:3000/api/feed?limit=5
# Expect 200 with items array (public endpoint)

curl http://localhost:3000/api/feed/tags
# Expect 200 with tags array

curl -X POST http://localhost:3000/api/feed
# Expect 401 (provider auth required)

# Verify pages render
# /discover — should show grid (may be empty without seed data)
# /dashboard/feed — should show feed management (requires auth)

# Mobile
cd apps/mobile && npx expo start
# Client feed tab should render
```

---

## Shared Package Changes (`packages/shared/`)

```typescript
// src/validators/feed.ts
export const createFeedItemSchema = z.object({
  mediaAssetId: z.string().min(1),
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(30).regex(/^[a-z0-9-]+$/)).max(10).default([]),
  serviceId: z.string().nullish(),
});

export const updateFeedItemSchema = z.object({
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(30).regex(/^[a-z0-9-]+$/)).max(10).optional(),
  active: z.boolean().optional(),
});

export const feedQuerySchema = z.object({
  tag: z.string().max(30).optional(),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
```

---

## Notes for Agents
- **Feed ranking algorithm for V1 is simple:** `ORDER BY (likeCount * 0.3 + (1 / age_in_hours) * 0.7) DESC`. Don't over-engineer. Can improve later.
- **View count increment must be async** — use a fire-and-forget Prisma update or queue it to BullMQ. Don't slow down the feed response.
- **Tags are provider-entered, not from a fixed taxonomy.** Normalize to lowercase-hyphenated. Trending tags endpoint aggregates what providers have used.
- **Media URLs come from the existing MediaAsset model** — these are already Cloudflare R2 URLs. Don't upload new media; feed items reference existing portfolio assets.
- **The web discover page should be SEO-friendly** — use Next.js server components for initial data fetch. The grid can hydrate to client-side for infinite scroll.
- **Double-tap to like on mobile** — use a gesture handler with debounce to prevent double-fires.
- **Masonry grid on web** — use CSS columns or a library like `react-masonry-css`. Don't use a heavy dependency.
