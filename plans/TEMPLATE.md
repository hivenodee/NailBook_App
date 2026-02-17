# Plan: [Feature Name]

## Overview

What are we building? One paragraph summary.

## Motivation

Why is this needed? What problem does it solve?

## Scope

### In Scope
- Feature 1
- Feature 2

### Out of Scope
- Not doing X
- Not doing Y

## Architecture

### New Prisma Models
```prisma
model ExampleModel {
  id          String   @id @default(cuid())
  providerId  String
  // fields...
  provider    Provider @relation(fields: [providerId], references: [id])
  @@index([providerId])
}
```

### New/Modified Zod Schemas
```typescript
export const exampleSchema = z.object({
  field: z.string().min(1).max(100),
});
```

### New API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/example` | Provider | List examples |
| POST | `/api/example` | Provider | Create example |

### New Pages
| Path | Type | Description |
|------|------|-------------|
| `/dashboard/example` | Client component | Dashboard page |
| `/:slug/example` | Server component | Public page |

### New Components
- `ExampleCard` — displays an example item
- `ExampleForm` — create/edit form

### New Lib Utilities
- `apps/web/src/lib/example.ts` — helper functions

## Data Flow

1. User does X
2. Frontend calls POST /api/example
3. API validates, creates record, sends notification
4. Frontend polls/refreshes

## Integration Points

- Which existing features does this touch?
- What cache invalidation is needed?
- What emails/SMS are sent?

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Validation

### Schema
```bash
cd packages/db && npx prisma validate
```

### TypeScript
```bash
cd apps/web && npx tsc --noEmit
```

### Manual Testing
1. Step 1
2. Step 2
3. Step 3
