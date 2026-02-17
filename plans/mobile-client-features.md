# Plan: Mobile App Client Features

## Summary
Build the client-side mobile experience in the Expo app. Clients currently book only through the web flow (shareable link). This plan adds native app features so clients can manage their bookings, discover providers, message providers, and rebook — all from the app. The mobile app already has role-based tab navigation scaffolded (Client tabs: Feed, Search, Bookings, Messages, Profile).

## Existing Features This Touches
- **Public Booking Flow (Web)** — mobile booking reuses the same API endpoints
- **Appointment model** — clients view their own appointments
- **Provider model** — clients browse/search/favorite providers
- **FavoriteProvider model** — already exists in schema
- **Thread / Message models** — in-app messaging already exists
- **Feedback model** — post-appointment feedback
- **Waitlist model** — joining waitlists
- **Coupon model** — validating coupon codes

---

## New Prisma Models

Only one small addition:

```prisma
model SearchHistory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  query     String
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

**Relation to add to User model:**
```prisma
searchHistory SearchHistory[]
```

---

## New API Endpoints

### 1. Client's Bookings
- **URL:** `GET /api/client/bookings`
- **Auth:** Authenticated client (Clerk)
- **Query params:** `?status=CONFIRMED,COMPLETED&limit=20&cursor=xxx`
- **Response (200):**
  ```json
  {
    "bookings": [
      {
        "id": "cuid",
        "provider": { "id": "x", "businessName": "Jane's Nails", "slug": "janesnails", "profileImage": "url" },
        "service": { "id": "x", "name": "Gel Manicure", "durationMinutes": 60 },
        "addOns": [{ "name": "Nail Art", "price": 1500 }],
        "scheduledAt": "2025-02-20T14:00:00Z",
        "status": "CONFIRMED",
        "totalPrice": 7500,
        "depositPaid": 2000,
        "balanceRemaining": 5500
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```
- **Logic:** Query appointments where the client's userId matches, include provider + service relations. This is a **new endpoint** because the existing `GET /api/appointments` is provider-scoped.

### 2. Favorite a Provider
- **URL:** `POST /api/client/favorites`
- **Auth:** Authenticated client (Clerk)
- **Request:**
  ```json
  { "providerId": "cuid" }
  ```
- **Response (201):**
  ```json
  { "id": "cuid", "providerId": "cuid", "createdAt": "..." }
  ```
- **Logic:** Create FavoriteProvider record. Idempotent — if already exists, return existing.

### 3. Remove Favorite
- **URL:** `DELETE /api/client/favorites/:providerId`
- **Auth:** Authenticated client (Clerk)
- **Response (200):**
  ```json
  { "success": true }
  ```

### 4. List Favorites
- **URL:** `GET /api/client/favorites`
- **Auth:** Authenticated client (Clerk)
- **Response (200):**
  ```json
  {
    "favorites": [
      {
        "id": "cuid",
        "provider": {
          "id": "x",
          "businessName": "Jane's Nails",
          "slug": "janesnails",
          "profileImage": "url",
          "rating": 4.8,
          "reviewCount": 42
        },
        "createdAt": "..."
      }
    ]
  }
  ```

### 5. Search Providers
- **URL:** `GET /api/client/search`
- **Auth:** Authenticated client (Clerk)
- **Query params:** `?q=gel+nails&lat=39.0&lng=-76.7&radius=25&limit=20&cursor=xxx`
- **Response (200):**
  ```json
  {
    "providers": [
      {
        "id": "cuid",
        "businessName": "Jane's Nails",
        "slug": "janesnails",
        "profileImage": "url",
        "rating": 4.8,
        "reviewCount": 42,
        "services": [{ "name": "Gel Manicure", "priceMin": 4500 }],
        "distance": 3.2,
        "booksOpen": true
      }
    ],
    "nextCursor": "cuid_or_null"
  }
  ```
- **Logic:** Full-text search on provider businessName + service names. If lat/lng provided, sort by distance (Haversine). Filter by booksOpen status. Save to SearchHistory.
- **Validation:**
  ```typescript
  const searchProvidersSchema = z.object({
    q: z.string().min(1).max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(100).default(25), // miles
    limit: z.coerce.number().min(1).max(50).default(20),
    cursor: z.string().optional(),
  });
  ```

### 6. Client Profile
- **URL:** `GET /api/client/profile`
- **Auth:** Authenticated client (Clerk)
- **Response (200):**
  ```json
  {
    "id": "cuid",
    "name": "Alice",
    "email": "alice@example.com",
    "phone": "+1234567890",
    "totalBookings": 12,
    "upcomingBookings": 2,
    "favoriteCount": 5
  }
  ```

### 7. Submit Feedback (from mobile)
Uses existing `POST /api/feedback` endpoint — already public and rate-limited.

### 8. Join Waitlist (from mobile)
Uses existing `POST /api/waitlist` endpoint — already public and rate-limited.

---

## New Mobile Screens (`apps/mobile/src/`)

### Feed Tab (Home)
| Screen | Path | Description |
|--------|------|-------------|
| Feed | `screens/client/FeedScreen.tsx` | Personalized home screen. Shows: upcoming booking card at top, favorite providers horizontal scroll, recently viewed providers. If no data, show onboarding prompts. |

### Search Tab
| Screen | Path | Description |
|--------|------|-------------|
| Search | `screens/client/SearchScreen.tsx` | Search bar at top. Results show provider cards with image, name, rating, distance. Location permission request for distance sorting. |
| Provider Profile | `screens/client/ProviderProfileScreen.tsx` | Public provider profile — portfolio grid, services list, reviews, policies. "Book Now" button → opens booking flow. Heart icon to favorite/unfavorite. |
| Booking Flow | `screens/client/BookingFlowScreen.tsx` | 3-step booking (mirrors web): select time → enter details → review & pay. Uses Stripe React Native for payment. Validates coupons via existing endpoint. |

### Bookings Tab
| Screen | Path | Description |
|--------|------|-------------|
| Bookings List | `screens/client/BookingsScreen.tsx` | Two sections: "Upcoming" and "Past". Each booking shows provider, service, date, status badge. Pull-to-refresh. |
| Booking Detail | `screens/client/BookingDetailScreen.tsx` | Full booking info — provider, service, add-ons, payment breakdown, status. Actions: Cancel (if allowed), Pay Balance, Leave Feedback, Rebook. |

### Messages Tab
| Screen | Path | Description |
|--------|------|-------------|
| Thread List | `screens/client/MessagesScreen.tsx` | List of message threads with providers. Shows last message preview, timestamp, unread badge. |
| Thread Detail | `screens/client/ThreadDetailScreen.tsx` | Chat view with provider. Send/receive messages. Uses existing `GET/POST /api/messages` endpoints. |

### Profile Tab
| Screen | Path | Description |
|--------|------|-------------|
| Profile | `screens/client/ProfileScreen.tsx` | Name, email, phone. Booking stats. Favorites list (tap to view provider). Notification preferences toggle. Sign out. |

### Shared Components (`components/client/`)
| Component | Description |
|-----------|-------------|
| `ProviderCard.tsx` | Card with provider image, name, rating, distance. Used in Feed, Search, Favorites. |
| `BookingCard.tsx` | Card with provider, service, date, status. Used in Feed (upcoming), Bookings list. |
| `ServiceCard.tsx` | Service name, price, duration. Used in provider profile and booking flow. |
| `ReviewCard.tsx` | Star rating, comment, date. Used in provider profile. |
| `FavoriteButton.tsx` | Heart icon toggle — calls favorite/unfavorite endpoints. |

---

## Navigation Structure

```
ClientTabNavigator (bottom tabs)
├── FeedStack
│   ├── FeedScreen
│   └── ProviderProfileScreen
│       └── BookingFlowScreen
├── SearchStack
│   ├── SearchScreen
│   └── ProviderProfileScreen
│       └── BookingFlowScreen
├── BookingsStack
│   ├── BookingsScreen
│   └── BookingDetailScreen
├── MessagesStack
│   ├── MessagesScreen
│   └── ThreadDetailScreen
└── ProfileStack
    └── ProfileScreen
```

---

## Acceptance Criteria

### Feed Tab
- [ ] Feed shows upcoming booking card if client has upcoming appointments
- [ ] Favorite providers render in horizontal scroll
- [ ] Empty state shows onboarding content for new clients
- [ ] Tapping a provider navigates to ProviderProfileScreen

### Search Tab
- [ ] Search bar accepts text input and returns results from `/api/client/search`
- [ ] Provider cards show image, name, rating, distance (if location granted)
- [ ] Location permission is requested on first search
- [ ] Tapping a provider navigates to ProviderProfileScreen
- [ ] Provider profile shows portfolio, services, reviews, policies
- [ ] "Book Now" navigates to BookingFlowScreen
- [ ] Favorite heart icon toggles and calls favorite/unfavorite endpoints

### Booking Flow
- [ ] Step 1: Date picker → fetches available slots from `GET /api/availability/:slug`
- [ ] Step 2: Client info form (name, email, phone) + coupon code input
- [ ] Coupon validation calls existing `POST /api/coupons/validate`
- [ ] Step 3: Review screen shows service, add-ons, pricing breakdown, deposit amount
- [ ] "Pay & Book" creates appointment via `POST /api/appointments` and opens Stripe checkout
- [ ] Confirmation screen shows booking details after successful payment
- [ ] Cash booking option works (no Stripe redirect)

### Bookings Tab
- [ ] Upcoming bookings show sorted by date ascending
- [ ] Past bookings show sorted by date descending
- [ ] Pull-to-refresh updates both lists
- [ ] Booking detail shows full info with payment breakdown
- [ ] Cancel button works for cancellable appointments
- [ ] "Pay Balance" opens Stripe checkout for remaining balance
- [ ] "Leave Feedback" navigates to feedback form
- [ ] "Rebook" navigates to BookingFlowScreen with same provider pre-selected

### Messages Tab
- [ ] Thread list shows all conversations with providers
- [ ] Unread message badge shows correct count
- [ ] Chat view renders message history
- [ ] Sending a message calls `POST /api/messages` and appears in thread

### Profile Tab
- [ ] Client info displays correctly
- [ ] Booking stats (total, upcoming) are accurate
- [ ] Favorites list shows with provider cards
- [ ] Sign out clears session and returns to auth

### Cross-cutting
- [ ] All API calls include Clerk bearer token
- [ ] Loading/error/empty states are handled on every screen
- [ ] Design system colors match NailBook palette
- [ ] `tsc --noEmit` passes
- [ ] Expo dev server starts without errors
- [ ] New Zod schemas are in `@nailbook/shared`

---

## Validation Commands

```bash
# Schema validation (for SearchHistory model)
cd packages/db && npx prisma validate

# Type checking
pnpm tsc --noEmit

# Generate Prisma client
pnpm db:generate

# Expo starts
cd apps/mobile && npx expo start

# Test new API endpoints
curl http://localhost:3000/api/client/bookings  # Expect 401
curl http://localhost:3000/api/client/search?q=nails  # Expect 401
curl http://localhost:3000/api/client/favorites  # Expect 401
curl http://localhost:3000/api/client/profile  # Expect 401

# Manual device testing
# 1. Sign in as client account
# 2. Verify all 5 client tabs render
# 3. Search for a provider → view profile → complete booking flow
# 4. Check booking appears in Bookings tab
# 5. Send a message to provider
```

---

## Dependencies to Install

```bash
# In apps/mobile (most should already be available via Expo 52)
npx expo install @stripe/stripe-react-native  # May already be installed
npx expo install expo-location                 # For search distance sorting
```

---

## Notes for Agents
- **Booking flow on mobile must produce the exact same API calls** as the web booking flow. Don't invent new endpoints — use `POST /api/appointments` with the same request shape.
- **Stripe React Native** handles payment sheet natively — no need for WebView. The server creates a PaymentIntent/CheckoutSession, mobile opens the Stripe payment sheet.
- **Provider profile on mobile** is a read-only view of the same data the web shows at `/:slug`. Reuse `GET /api/providers/:id` and `GET /api/services`.
- **Messages use the existing Thread/Message system.** Don't create a new messaging architecture.
- **FavoriteProvider model already exists** in the schema — you're just building API endpoints and UI around it.
- **Search is basic for V1** — text matching on provider name and service names. Full geo-search with PostGIS can come later. For now, if the Provider model has lat/lng fields, use Haversine formula in the query. If not, skip distance sorting and just do text search.
