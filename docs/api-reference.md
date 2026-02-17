# NailBook API Reference

Last updated: 2026-02-16

All API routes are under `/api/`. Responses follow the shape `{ data: T }` on success or `{ error: { message, code? } }` on failure. All routes use `export const dynamic = "force-dynamic"`.

---

## Appointments

### POST /api/appointments
Create a new booking.

- **Auth**: Public (uses authenticated user if available, creates guest user otherwise)
- **Body**:
  ```json
  {
    "serviceId": "string",
    "startTime": "ISO 8601",
    "clientName": "string",
    "clientEmail": "string",
    "clientPhone": "string?",
    "paymentMethod": "CARD | APPLE_PAY | GOOGLE_PAY | CASH_APP_PAY | CASH",
    "inspirationUrl": "string?",
    "addOnIds": "string[]?",
    "couponCode": "string?"
  }
  ```
- **Response**: `{ appointment, checkoutUrl? }`
- **Side Effects**: Cache invalidation, email/SMS confirmation, reminder scheduling, waitlist update, Stripe checkout (if paid)
- **Notes**: Validates books open, booking window, add-on group rules, coupon, slot availability, payment method acceptance

### GET /api/appointments
List appointments for the current user.

- **Auth**: Clerk (required)
- **Query**: `?status=CONFIRMED|PENDING_PAYMENT|COMPLETED|CANCELLED|NO_SHOW`
- **Response**: `[{ id, status, startTime, endTime, totalInCents, depositInCents, service, addOns, client, provider }]`
- **Notes**: Returns provider's appointments if user is a provider, client's bookings otherwise

### GET /api/appointments/:id
Get appointment detail.

- **Auth**: Public (CUID acts as access token)
- **Response**: Full appointment with service, addOns, provider, client, events, payments, feedback

### PATCH /api/appointments/:id
Update appointment status.

- **Auth**: Clerk (provider or client ownership)
- **Body**: `{ action: "accept" | "cancel" | "complete" | "reschedule" | "no_show", startTime?: "ISO 8601" }`
- **Response**: Updated appointment
- **Side Effects**:
  - `cancel`: Email/SMS, cache invalidation, waitlist notification, cancel reminders
  - `complete`: Completion email (with balance pay link if applicable), schedule follow-up
  - `reschedule`: Cache invalidation (both dates), waitlist notification
  - `no_show`: Cancel reminders, waitlist notification

---

## Balance

### GET /api/appointments/:id/balance
Get remaining balance info.

- **Auth**: Public
- **Response**:
  ```json
  {
    "totalInCents": 7500,
    "depositInCents": 2000,
    "balancePaidInCents": 0,
    "remainingInCents": 5500,
    "isPaid": false,
    "service": { "name": "Gel Full Set" },
    "provider": { "businessName": "...", "slug": "..." },
    "clientName": "Jane"
  }
  ```

### POST /api/appointments/:id/balance/checkout
Create Stripe checkout for remaining balance.

- **Auth**: Public
- **Response**: `{ checkoutUrl: "https://checkout.stripe.com/..." }`
- **Notes**: Only works for CONFIRMED or COMPLETED appointments with remaining balance. Sets `paymentType: "BALANCE"` in Stripe metadata.

### POST /api/appointments/:id/collect-balance
Provider-initiated balance collection.

- **Auth**: Clerk (provider only, must own appointment)
- **Body**: `{ action: "send-link" | "mark-cash" }`
- **Response**:
  - `send-link`: `{ checkoutUrl }` — also sends email/SMS, logs event
  - `mark-cash`: `{ payment }` — creates BALANCE COMPLETED CASH payment, logs event

---

## Availability

### GET /api/availability/:slug
Get available time slots for a date.

- **Auth**: Public
- **Query**: `?date=YYYY-MM-DD` (required)
- **Response**:
  ```json
  {
    "booksOpen": true,
    "booksOpenAt": null,
    "timezone": "America/New_York",
    "outsideWindow": false,
    "slots": [
      { "startTime": "ISO", "endTime": "ISO", "available": true }
    ]
  }
  ```
- **Cache**: Redis 300s TTL, invalidated on mutations
- **Notes**: Auto-opens books if scheduled time passed. Returns empty slots if books closed or outside window.

### GET /api/availability/rules
List provider's weekly schedule rules.

- **Auth**: Clerk (provider only)
- **Response**: `[{ id, dayOfWeek, startTime, endTime, isActive }]`

### POST /api/availability/rules
Bulk upsert weekly schedule (up to 7 rules).

- **Auth**: Clerk (provider only)
- **Body**: `[{ dayOfWeek, startTime, endTime, isActive }]`
- **Response**: Updated rules array
- **Side Effects**: Invalidates all availability cache, notifies all future waitlist entries

### GET /api/availability/time-off
List future time-off blocks.

- **Auth**: Clerk (provider only)
- **Response**: `[{ id, startDate, endDate, reason }]`

### POST /api/availability/time-off
Create time-off block.

- **Auth**: Clerk (provider only)
- **Body**: `{ startDate: "ISO", endDate: "ISO", reason?: "string" }`
- **Response**: Created time-off record
- **Side Effects**: Invalidates availability cache for date range

### DELETE /api/availability/time-off/:id
Delete time-off block.

- **Auth**: Clerk (provider only)
- **Side Effects**: Invalidates cache for range, notifies waitlist for freed dates

---

## Clients

### GET /api/clients
List provider's clients.

- **Auth**: Clerk (provider only)
- **Query**: `?search=query` (searches name, email, phone)
- **Response**: `[{ id, name, email, phone, notes, appointmentCount, lastAppointmentDate }]`

### GET /api/clients/:id
Get client detail with appointment history.

- **Auth**: Clerk (provider only)
- **Response**: Client with appointments (includes services, add-ons)

### PATCH /api/clients/:id
Update client notes.

- **Auth**: Clerk (provider only)
- **Body**: `{ notes?: "string", name?: "string", phone?: "string" }`
- **Response**: Updated client

---

## Coupons

### GET /api/coupons
List provider's coupons.

- **Auth**: Clerk (provider only)
- **Response**: Coupons with service restrictions

### POST /api/coupons
Create coupon.

- **Auth**: Clerk (provider only)
- **Body**: `{ code, type: "PERCENT" | "FIXED", value, expiresAt?, maxUses?, serviceIds[]? }`
- **Response**: Created coupon
- **Notes**: Code auto-uppercased, uniqueness per provider enforced

### PATCH /api/coupons/:id
Toggle coupon active status.

- **Auth**: Clerk (provider only)
- **Response**: Updated coupon

### POST /api/coupons/validate
Validate a coupon code during booking.

- **Auth**: Public
- **Body**: `{ code, slug, serviceId }`
- **Response**: `{ valid: boolean, type?, value?, reason? }`

---

## Dashboard Analytics

### GET /api/dashboard/analytics
Provider analytics data.

- **Auth**: Clerk (provider only)
- **Query**: `?range=7d|30d|90d|ytd|all&granularity=daily|weekly|monthly|yearly`
- **Response**:
  ```json
  {
    "rangeStart": "ISO",
    "rangeEnd": "ISO",
    "summary": {
      "revenue": 0,
      "lostRevenue": 0,
      "recoveredRevenue": 0,
      "netRevenue": 0,
      "appointmentCount": 0,
      "confirmedCount": 0,
      "cancelledCount": 0,
      "noShowCount": 0,
      "waitlistRecoveryCount": 0
    },
    "buckets": [{ "date": "ISO", "label": "...", "revenue": 0, "lostRevenue": 0, "recoveredRevenue": 0, "netRevenue": 0 }]
  }
  ```

---

## Exports

### GET /api/exports
List recent export jobs.

- **Auth**: Clerk (provider only)
- **Response**: Last 20 export jobs

### POST /api/exports
Request CSV export.

- **Auth**: Clerk (provider only)
- **Body**: `{ type: "CLIENTS" | "APPOINTMENTS" | "TRANSACTIONS" }`
- **Response**: Created export job (PENDING status)

---

## Feedback

### POST /api/feedback
Submit anonymous feedback.

- **Auth**: Public (no auth)
- **Body**: `{ appointmentId, rating?: 1-5, body: "1-2000 chars" }`
- **Response**: Created feedback
- **Notes**: One per appointment, only for COMPLETED appointments

### GET /api/feedback
List provider's feedback.

- **Auth**: Clerk (provider only)
- **Query**: `?public=true|false&page=1&limit=20`
- **Response**: Paginated feedback with appointment service info

### PATCH /api/feedback/:id
Toggle feedback public/private.

- **Auth**: Clerk (provider only)
- **Body**: `{ isPublic: boolean }`

---

## Media

### GET /api/media
List media assets.

- **Auth**: Public
- **Query**: `?providerId=string` (required)
- **Response**: Media assets sorted by sortOrder (hidden assets filtered for public access)

### POST /api/media
Request presigned upload URL.

- **Auth**: Clerk (provider only)
- **Body**: `{ contentType: "image/jpeg", type: "PHOTO" | "VIDEO" }`
- **Response**: `{ uploadUrl: "presigned PUT URL", media: { id, url, ... } }`
- **Notes**: 50-item portfolio limit enforced

### PATCH /api/media/:id
Update media asset.

- **Auth**: Clerk (provider only)
- **Body**: `{ isHidden?: boolean, sortOrder?: number }`

### DELETE /api/media/:id
Delete media asset.

- **Auth**: Clerk (provider only)

---

## Message Templates

### GET /api/message-templates
Get all template types with custom overrides.

- **Auth**: Clerk (provider only)
- **Response**: All template types with defaults, custom values, and available variables

### PUT /api/message-templates
Bulk upsert templates.

- **Auth**: Clerk (provider only)
- **Body**: `[{ type, emailSubject?, emailBody?, smsBody? }]`

### POST /api/message-templates/preview
Render template with sample data.

- **Auth**: Clerk (provider only)
- **Body**: `{ type, emailSubject, emailBody, smsBody }`
- **Response**: Rendered templates with sample variables

---

## Messages

### GET /api/messages
Get messages in a thread.

- **Auth**: Clerk (required)
- **Query**: `?threadId=string`
- **Response**: Messages with sender info

### POST /api/messages
Send a message.

- **Auth**: Clerk (required)
- **Body**: `{ threadId, body }`

---

## Payments

### GET /api/payments
Provider's transaction ledger.

- **Auth**: Clerk (provider only)
- **Query**: `?status=COMPLETED|PENDING|FAILED|REFUNDED&limit=20&offset=0`
- **Response**: `{ payments: [...], total: number }`

---

## Providers

### GET /api/providers
Discovery feed.

- **Auth**: Public
- **Query**: `?lat=number&lng=number&limit=20&offset=0`
- **Response**: Providers with services and portfolio

### POST /api/providers
Create provider profile.

- **Auth**: Clerk (required)
- **Body**: `{ businessName, slug, bio?, locationAddress? }`

### GET /api/providers/:id
Get provider profile.

- **Auth**: Public
- **Response**: Provider with services, add-ons, media assets

### PATCH /api/providers/:id
Update provider.

- **Auth**: Clerk (ownership required)

### GET /api/providers/me
Get current user's provider profile.

- **Auth**: Clerk (provider only)

### PATCH /api/providers/me
Update current provider settings.

- **Auth**: Clerk (provider only)
- **Body**: Any of: businessName, bio, locationAddress, instagramUrl, tiktokUrl, acceptsCard, acceptsApplePay, acceptsGooglePay, acceptsCashAppPay, acceptsCash, cancellationHours, arrivalGraceMinutes, booksOpen, booksOpenAt, bookingWindowDays

### GET /api/providers/:slug/reviews
Get public reviews for a provider.

- **Auth**: Public
- **Response**: `{ reviews: [...], avgRating: number, count: number }`

---

## Services

### GET /api/services
List services.

- **Auth**: Public
- **Query**: `?providerId=string&all=true` (all includes inactive)
- **Response**: Services with add-ons and add-on groups

### POST /api/services
Create service.

- **Auth**: Clerk (provider only)
- **Body**: `{ name, priceInCents, durationMinutes, description?, depositType?, depositValue? }`

### GET /api/services/:id
Get service detail.

- **Auth**: Public
- **Query**: `?all=true` (includes inactive add-ons)
- **Response**: Service with add-ons, groups, and full provider settings (payment methods, booking controls, timezone)

### PATCH /api/services/:id
Update service.

- **Auth**: Clerk (provider only)

### POST /api/services/:id/addon-groups
Create add-on group.

- **Auth**: Clerk (provider only)
- **Body**: `{ name, rule: "OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE", sortOrder? }`

### PATCH /api/services/:id/addon-groups/:groupId
Update add-on group.

- **Auth**: Clerk (provider only)

### DELETE /api/services/:id/addon-groups/:groupId
Delete add-on group (orphans child add-ons).

- **Auth**: Clerk (provider only)

### POST /api/services/:id/addons
Create add-on.

- **Auth**: Clerk (provider only)
- **Body**: `{ name, priceInCents, durationMinutes?, groupId?, isMandatory?, sortOrder? }`

### PATCH /api/services/:id/addons/:addonId
Update add-on.

- **Auth**: Clerk (provider only)

### DELETE /api/services/:id/addons/:addonId
Delete add-on.

- **Auth**: Clerk (provider only)

---

## Waitlist

### POST /api/waitlist
Join waitlist (public).

- **Auth**: Public
- **Body**: `{ serviceId?, targetDate: "YYYY-MM-DD", targetTime?: "ISO", timePreference?: "ANY" | "MORNING" | "AFTERNOON" | "EVENING", clientName, clientEmail, clientPhone? }`
- **Response**: `{ id, status }`
- **Side Effects**: Sends waitlist joined confirmation email/SMS

### GET /api/waitlist/entries
List waitlist entries.

- **Auth**: Clerk (provider only)
- **Query**: `?status=ACTIVE|AVAILABLE|NOTIFIED|EXPIRED&page=1&pageSize=20`
- **Response**: Paginated entries with service info
- **Notes**: Auto-expires past-date entries on fetch

### DELETE /api/waitlist/entries/:id
Remove waitlist entry.

- **Auth**: Clerk (provider only)

### POST /api/waitlist/entries/:id/approve
Approve waitlist entry (send notification).

- **Auth**: Clerk (provider only)
- **Side Effects**: Sends email/SMS with booking link, updates status to NOTIFIED
- **Notes**: Only works on AVAILABLE status entries

---

## Webhooks

### POST /api/webhooks/stripe
Stripe webhook handler.

- **Auth**: Stripe signature verification
- **Events**:
  - `checkout.session.completed`:
    - `paymentType === "BALANCE"`: Creates BALANCE payment, logs event (no status change)
    - `paymentType === "DEPOSIT" | "FULL"`: Confirms appointment, creates payment, sends email/SMS, schedules reminders, invalidates cache
  - `checkout.session.expired`: Logs event, invalidates cache, notifies waitlist
  - `charge.refunded`: Marks payment as REFUNDED, logs event
- **Idempotency**: Checks `stripeEventId` in AppointmentEvent metadata
