# Plan: Mobile App Provider Features

## Summary
Build the provider-side mobile experience in the Expo app. Providers currently manage everything via the web dashboard — this plan brings the core daily-use features to the native app so providers can manage their business on the go. The mobile app already has Clerk auth, Stripe React Native, and role-based tab navigation scaffolded (Provider tabs: Today, Calendar, Clients, Money, Profile).

## Existing Features This Touches
- **Provider Dashboard (Web)** — we're building mobile equivalents, NOT replacing the web versions. Mobile calls the same API endpoints.
- **Appointment model + AppointmentEvent** — read/update via existing endpoints
- **Service model** — read-only on mobile for V1 (manage via web)
- **ProviderClient model** — client directory on mobile
- **Payment model + analytics** — money tab reads existing analytics endpoint
- **Provider model** — profile settings

---

## No New Prisma Models

This plan uses **all existing models and endpoints**. The mobile app is a new client consuming the existing REST API. No schema changes needed.

---

## API Endpoints Used (Existing — No New Endpoints)

The mobile app consumes these existing endpoints. Listed here so agents know the data shapes.

| Tab | Endpoint | Method | Purpose |
|-----|----------|--------|---------|
| Today | `/api/appointments?status=CONFIRMED&date=today` | GET | Today's appointments |
| Today | `/api/appointments/:id` | GET | Appointment detail |
| Today | `/api/appointments/:id` | PATCH | Complete / cancel / no-show |
| Today | `/api/appointments/:id/collect-balance` | POST | Send payment link or mark cash |
| Calendar | `/api/appointments?startDate=X&endDate=Y` | GET | Appointments for date range |
| Calendar | `/api/availability/rules` | GET | Weekly availability rules |
| Calendar | `/api/availability/time-off` | GET | Time-off blocks |
| Clients | `/api/clients` | GET | Client directory |
| Clients | `/api/clients/:id` | GET | Client detail + history |
| Clients | `/api/clients/:id` | PATCH | Update notes |
| Money | `/api/dashboard/analytics?range=X&granularity=Y` | GET | Revenue analytics |
| Money | `/api/payments?limit=20&cursor=X` | GET | Transaction ledger |
| Profile | `/api/providers/me` | GET | Provider profile |
| Profile | `/api/providers/me` | PATCH | Update profile |

### One New Endpoint Needed

**Share booking link deep link support:**
- **URL:** `GET /api/providers/me/share-link`
- **Auth:** Provider (Clerk)
- **Response (200):**
  ```json
  {
    "url": "https://nailbook.app/janesnails",
    "slug": "janesnails"
  }
  ```
- **Logic:** Return the provider's public booking URL. Simple helper for the native share sheet.

---

## New Mobile Screens (`apps/mobile/src/`)

All screens are **client components** (React Native). Follow existing Expo patterns in the codebase.

### Today Tab
| Screen | Path | Description |
|--------|------|-------------|
| Today List | `screens/provider/TodayScreen.tsx` | Scrollable list of today's appointments grouped by time. Status badges (CONFIRMED, COMPLETED, etc). Pull-to-refresh. Empty state when no appointments. |
| Appointment Detail | `screens/provider/AppointmentDetailScreen.tsx` | Full appointment view — client info, service breakdown, payment history, activity log. Action buttons: Complete, Cancel, No-Show. Balance collection (send link / mark cash). |

### Calendar Tab
| Screen | Path | Description |
|--------|------|-------------|
| Calendar View | `screens/provider/CalendarScreen.tsx` | Month view with dots on days that have appointments. Tap a day to see that day's appointments in a bottom sheet. Shows time-off blocks as shaded ranges. |
| Day Detail | `screens/provider/DayDetailSheet.tsx` | Bottom sheet showing appointments for selected day, sorted by time. Tap to navigate to AppointmentDetailScreen. |

### Clients Tab
| Screen | Path | Description |
|--------|------|-------------|
| Client List | `screens/provider/ClientsScreen.tsx` | Searchable, scrollable directory. Shows name, visit count, last visit date. Search bar at top filters by name. |
| Client Detail | `screens/provider/ClientDetailScreen.tsx` | Client info, notes (editable), appointment history list. Tap an appointment to view detail. |

### Money Tab
| Screen | Path | Description |
|--------|------|-------------|
| Money Overview | `screens/provider/MoneyScreen.tsx` | KPI cards at top (revenue, lost, recovered, net). Time range selector (7d, 30d, 90d, 1y). Simple line chart. Transaction list below with infinite scroll. |

### Profile Tab
| Screen | Path | Description |
|--------|------|-------------|
| Profile | `screens/provider/ProfileScreen.tsx` | Business name, bio, social links (read-only for V1 — edit via web). Share booking link button (native share sheet). Toggle books open/closed. Sign out button. |

### Shared Components (`components/provider/`)
| Component | Description |
|-----------|-------------|
| `AppointmentCard.tsx` | Reusable card showing time, client name, service, status badge. Used in Today, Calendar, Client Detail. |
| `StatusBadge.tsx` | Colored badge for appointment status (uses existing enum values). |
| `KPICard.tsx` | Revenue metric card with label, value, trend indicator. |
| `EmptyState.tsx` | Friendly empty state illustration + message. |

---

## Navigation Structure

```
ProviderTabNavigator (bottom tabs)
├── TodayStack
│   ├── TodayScreen
│   └── AppointmentDetailScreen
├── CalendarStack
│   ├── CalendarScreen
│   └── AppointmentDetailScreen (shared)
├── ClientsStack
│   ├── ClientsScreen
│   └── ClientDetailScreen
│       └── AppointmentDetailScreen (shared)
├── MoneyStack
│   └── MoneyScreen
└── ProfileStack
    └── ProfileScreen
```

---

## API Client Layer (`apps/mobile/src/api/`)

Create a typed API client that wraps fetch with Clerk token injection:

```typescript
// api/client.ts
import { useAuth } from "@clerk/clerk-expo";

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { getToken } = useAuth();
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// api/appointments.ts
export const getAppointments = (params: { status?: string; date?: string }) =>
  apiClient<AppointmentListResponse>(`/api/appointments?${new URLSearchParams(params)}`);

export const getAppointment = (id: string) =>
  apiClient<AppointmentDetailResponse>(`/api/appointments/${id}`);

export const updateAppointment = (id: string, body: UpdateAppointmentBody) =>
  apiClient<AppointmentDetailResponse>(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// api/clients.ts
export const getClients = () =>
  apiClient<ClientListResponse>("/api/clients");

export const getClient = (id: string) =>
  apiClient<ClientDetailResponse>(`/api/clients/${id}`);

// api/analytics.ts
export const getAnalytics = (params: { range: string; granularity: string }) =>
  apiClient<AnalyticsResponse>(`/api/dashboard/analytics?${new URLSearchParams(params)}`);

export const getPayments = (params: { limit: number; cursor?: string }) =>
  apiClient<PaymentListResponse>(`/api/payments?${new URLSearchParams(params as any)}`);
```

---

## Acceptance Criteria

### Today Tab
- [ ] Today screen shows appointments for current date, grouped by time
- [ ] Appointments show client name, service name, time, and status badge
- [ ] Pull-to-refresh fetches updated data
- [ ] Tapping an appointment navigates to detail screen
- [ ] Detail screen shows full appointment info, payment history, and activity log
- [ ] "Complete" button calls `PATCH /api/appointments/:id` with `{ status: "COMPLETED" }` and updates UI
- [ ] "Cancel" button shows confirmation dialog, then calls PATCH with `{ status: "CANCELLED" }`
- [ ] "No-Show" button calls PATCH with `{ status: "NO_SHOW" }`
- [ ] "Collect Balance" shows options: send payment link or mark cash received
- [ ] Empty state shows when no appointments today

### Calendar Tab
- [ ] Month calendar renders with dots on days that have appointments
- [ ] Tapping a day opens bottom sheet with that day's appointments
- [ ] Time-off blocks show as shaded/disabled ranges
- [ ] Can navigate between months
- [ ] Tapping an appointment in the bottom sheet navigates to detail

### Clients Tab
- [ ] Client list loads and displays all clients with visit count
- [ ] Search bar filters clients by name in real time
- [ ] Tapping a client navigates to detail screen
- [ ] Client detail shows notes (editable), appointment history
- [ ] Saving notes calls `PATCH /api/clients/:id`

### Money Tab
- [ ] KPI cards show revenue, lost, recovered, net for selected time range
- [ ] Time range selector switches between 7d, 30d, 90d, 1y
- [ ] Line chart renders revenue data
- [ ] Transaction list shows with infinite scroll pagination
- [ ] Each transaction shows amount, type, status, date

### Profile Tab
- [ ] Provider name, bio, and social links display
- [ ] Share booking link triggers native share sheet with provider URL
- [ ] Books open/closed toggle works and calls `PATCH /api/providers/me`
- [ ] Sign out button clears Clerk session and returns to auth screen

### Cross-cutting
- [ ] All API calls include Clerk bearer token
- [ ] Loading states show skeleton/spinner while data fetches
- [ ] Error states show retry button on API failures
- [ ] Navigation between screens uses stack navigation with back button
- [ ] All screens respect the NailBook design system colors
- [ ] `tsc --noEmit` passes
- [ ] Expo dev server starts without errors

---

## Validation Commands

```bash
# Type checking
cd apps/mobile && npx tsc --noEmit

# Expo starts
cd apps/mobile && npx expo start

# Full monorepo check
pnpm tsc --noEmit

# Verify on device/simulator
# 1. Open Expo Go on iOS/Android
# 2. Sign in as a provider account
# 3. Verify all 5 tabs render
# 4. Verify Today tab shows appointments (seed data needed)
# 5. Verify Calendar shows month view
# 6. Verify Clients tab lists clients
# 7. Verify Money tab shows analytics
# 8. Verify Profile shows provider info and share works
```

---

## Dependencies to Install

```bash
# In apps/mobile
npx expo install react-native-calendars  # Calendar month view
npx expo install @gorhom/bottom-sheet     # Bottom sheet for day detail
npx expo install react-native-reanimated  # Required by bottom-sheet (may already be installed)
npx expo install victory-native           # Charts (lightweight, RN-native)
```

---

## Notes for Agents
- **Do NOT duplicate business logic.** The mobile app is a thin client. All validation, pricing, status transitions happen on the server via existing API endpoints.
- **Use the existing API response shapes exactly.** Don't create new DTOs or transformers — the mobile app consumes the same JSON the web dashboard does.
- **Follow existing Expo patterns** in the codebase for navigation, auth token handling, and component structure.
- **Design system colors** are defined in the README — use the warm palette (sage primary `#7C8E6E`, rose accent `#C9A89C`, charcoal text `#2D2D2D`, etc).
- **One primary action per screen** — match the web dashboard's design principle.
- **Status transitions are server-enforced.** The mobile just sends the PATCH; the server validates whether the transition is allowed.
