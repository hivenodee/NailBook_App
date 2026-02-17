---
name: build-with-agent-team
description: Build NailBook features using Claude Code Agent Teams with tmux split panes. Takes a plan document path and optional team size. Use when you want multiple agents collaborating on a build.
argument-hint: [plan-path] [num-agents]
disable-model-invocation: true
---

# Build with Agent Team — NailBook

You are coordinating a build on the NailBook monorepo using Claude Code Agent Teams. Read the plan document, determine the right team structure, spawn teammates, and orchestrate the build.

## Critical: Read Project Context First

Before doing anything else, read these files in order. They are the source of truth for this project and ALL agents must follow them:

1. **`CLAUDE.md`** (repo root) — Project guardrails, V1 scope, what's in/out of scope
2. **`docs/product-spec.md`** — Product spec, feature definitions, non-negotiable principles
3. **`docs/architecture.md`** — System architecture, hosting, data model, invariants
4. **`docs/ui-guidelines.md`** — UI/UX rules, color palette, component rules, navigation
5. **`FEATURES.md`** (repo root) — Complete inventory of everything already built
6. **`README.md`** (repo root) — Tech stack, repo structure, API surface, getting started

**Every agent you spawn MUST receive instructions to read and follow these files.** No agent may violate the principles in these documents.

## Arguments

- **Plan path**: `$ARGUMENTS[0]` - Path to a markdown file describing what to build
- **Team size**: `$ARGUMENTS[1]` - Number of agents (optional)

## Step 1: Read the Plan

Read the plan document at `$ARGUMENTS[0]`. Understand:
- What are we building?
- What are the major components/layers?
- What technologies are involved?
- What are the dependencies between components?

Cross-reference the plan against FEATURES.md to understand what already exists. The plan should build ON TOP of existing work, never replace or break it.

## Step 2: Determine Team Structure

If team size is specified (`$ARGUMENTS[1]`), use that number of agents.

If NOT specified, analyze the plan and determine the optimal team size based on:
- **Number of independent components** (frontend, backend, database, infra, etc.)
- **Technology boundaries** (different languages/frameworks = different agents)
- **Parallelization potential** (what can be built simultaneously?)

**Guidelines:**
- 2 agents: Simple features with clear frontend/backend split
- 3 agents: Full-stack features (UI pages, API routes, schema/shared)
- 4 agents: Cross-platform features (web UI, API, mobile, schema)
- 5 agents: Large features touching all layers (web UI, API, mobile, worker, schema)

### NailBook Agent Boundaries

The monorepo has natural ownership boundaries. Use these as defaults:

| Agent | Owns | Does NOT Touch |
|-------|------|----------------|
| **schema** | `packages/db/prisma/schema.prisma`, `packages/shared/src/` | `apps/` directories |
| **api** | `apps/web/src/app/api/`, `apps/web/src/lib/` | Page components, mobile app, schema |
| **web-ui** | `apps/web/src/app/(public)/`, `apps/web/src/app/dashboard/`, `apps/web/src/components/` | API routes, mobile app, schema |
| **mobile** | `apps/mobile/src/` | `apps/web/`, `packages/db/` |
| **worker** | `apps/worker/src/` | `apps/web/`, `apps/mobile/` |

Adjust these based on the plan. Not every build needs all 5 agents.

## Step 3: Set Up Agent Team

Enable tmux split panes so each agent is visible:

```
teammateMode: "tmux"
```

## Step 4: Define Contracts

Before spawning agents, the lead reads the plan and defines the integration contracts between layers. This focused upfront work is what enables all agents to spawn in parallel without diverging on interfaces.

### NailBook Contract Chain

```
Schema (Prisma models + Zod validators) → API (Next.js routes + lib utilities) → Web UI (pages + components)
Schema (Prisma models + Zod validators) → API → Mobile (Expo screens)
API → Worker (BullMQ jobs)
```

### Author the Contracts

From the plan, define each integration contract. NailBook already has established patterns — contracts must follow them:

**Schema → API contract:**
- Prisma model definitions (fields, types, relations, indexes)
- Zod validation schemas in `packages/shared/src/validators.ts`
- TypeScript types in `packages/shared/src/types.ts`
- Constants/enums in `packages/shared/src/constants.ts`

**API → Web UI contract (NailBook conventions):**
- Endpoint URLs: `/api/{domain}` (no trailing slashes)
- Success response: `{ data: T }`
- Error response: `{ error: { message: string, code?: string } }`
- Auth: Clerk via `@clerk/nextjs/server` — `auth()` for protected, none for public
- Rate limiting: `rateLimit(req)` for public endpoints, `strictRateLimit(req)` for sensitive ones
- Pagination: `{ limit, offset }` query params, response includes `{ items, total }`

**API → Worker contract:**
- Job queue names and payload shapes
- Redis queue via BullMQ

**API → Mobile contract:**
- Same REST endpoints as web UI
- Auth: Clerk token in Authorization header

### Identify Cross-Cutting Concerns

NailBook-specific concerns to assign:
- **Timezone handling**: All date/time operations use `apps/web/src/lib/timezone.ts` utilities
- **Email/SMS templates**: Template variables in `apps/web/src/lib/templates.ts` — VARIABLES_BY_TYPE, DEFAULT_TEMPLATES
- **Cache invalidation**: Any mutation that affects availability must call invalidation from `apps/web/src/lib/cache.ts`
- **Status colors**: Use shared `apps/web/src/lib/status-colors.ts` — never inline status color logic
- **Lazy initialization**: All external service clients (Stripe, Redis, S3, Resend, Twilio) use getter patterns — never `new Client()` at module level
- **Price handling**: All prices in cents (integers), formatted with `(amountInCents / 100).toFixed(2)` for display
- **Multi-tenancy**: All queries scoped by `providerId` — no cross-provider data access
- **Design tokens**: Use Tailwind tokens from `tailwind.config.ts` — never raw gray/color classes

### Contract Quality Checklist

Before including a contract in agent prompts, verify:
- Are URLs exact? (e.g., `POST /api/appointments` not `POST /api/appointments/`)
- Are response shapes explicit JSON matching the `{ data }` / `{ error }` envelope?
- Are Prisma relations and includes specified?
- Are Zod schemas defined with exact field names and types?
- Does the contract reference existing patterns from FEATURES.md?

## Step 5: Spawn All Agents in Parallel

With contracts defined, spawn all agents simultaneously. Enter **Delegate Mode** (Shift+Tab) before spawning.

### Spawn Prompt Structure

```
You are the [ROLE] agent for the NailBook project.

## MANDATORY: Read These Files First
Before writing ANY code, read and internalize these project documents:
- `CLAUDE.md` — Project guardrails and V1 scope
- `docs/product-spec.md` — Product spec, feature definitions, non-negotiable principles
- `docs/architecture.md` — System architecture and invariants
- `docs/ui-guidelines.md` — UI/UX rules, colors, components
- `FEATURES.md` — What's already built (DO NOT rebuild or break these)
- `README.md` — Tech stack, structure, API reference

## Non-Negotiable Rules
1. **Do not break existing features.** Read FEATURES.md to understand what exists.
2. **Follow the design system.** Use Tailwind tokens from tailwind.config.ts, never raw colors.
3. **Follow architecture patterns.** Lazy init for services, providerId scoping, event sourcing for appointments.
4. **Follow the product spec.** If something isn't in claude.md, it's out of scope.
5. **All prices in cents.** Never store or compute with dollar floats.
6. **Timezone-aware.** Use timezone.ts utilities for all date/time operations.
7. **Explicit return types** on page/layout components (React types conflict workaround).
8. **`export const dynamic = "force-dynamic"`** on all API routes.

## Your Ownership
- You own: [directories/files]
- Do NOT touch: [other agents' files]

## What You're Building
[Relevant section from plan]

## Contracts

### Contract You Produce
[Include the lead-authored contract this agent is responsible for]
- Build to match this exactly
- If you need to deviate, message the lead and wait for approval before changing

### Contract You Consume
[Include the lead-authored contract this agent depends on]
- Build against this interface exactly — do not guess or deviate

### Cross-Cutting Concerns You Own
[Explicitly list integration behaviors this agent is responsible for]

## Coordination
- Message the lead if you discover something that affects a contract
- Ask before deviating from any agreed contract
- Flag cross-cutting concerns that weren't anticipated
- Share with [other agent] when: [trigger]

## Before Reporting Done
Run these validations and fix any failures:
1. [specific validation command — e.g., `cd apps/web && npx tsc --noEmit`]
2. [specific validation command]
Do NOT report done until all validations pass.
```

## Step 6: Facilitate Collaboration

All agents are working in parallel. Your job as lead is to keep them aligned and unblock them.

### During Implementation

- Relay messages between agents when they flag contract issues
- If an agent needs to deviate from a contract, evaluate the change, update the contract, and notify all affected agents
- Unblock agents waiting on decisions
- Track progress through the shared task list

### Pre-Completion Contract Verification

Before any agent reports "done", run a contract diff:
- "API agent: what exact endpoints did you create with what request/response shapes?"
- "Web UI agent: what exact fetch URLs are you calling with what request bodies?"
- "Schema agent: what exact Prisma models and Zod schemas did you create?"
- Compare and flag mismatches before integration testing

### Cross-Review
Each agent reviews another's work:
- Web UI reviews API endpoint usability
- API reviews Schema query patterns and indexes
- Schema reviews Web UI data access patterns

## Collaboration Patterns

**Anti-pattern: Parallel spawn without contracts** (agents diverge)
```
Lead spawns all 3 agents simultaneously without defining interfaces
Each agent builds to their own assumptions
Integration fails on URL mismatches, response shape mismatches ❌
```

**Anti-pattern: Fully sequential spawning** (defeats purpose of agent teams)
```
Lead spawns schema agent → waits → spawns api → waits → spawns web-ui
Only one agent works at a time, no parallelism ❌
```

**Good pattern: Lead-authored contracts, parallel spawn**
```
Lead reads plan → reads FEATURES.md + architecture.md → defines all contracts upfront → spawns all agents with contracts included
All agents build simultaneously to agreed interfaces → minimal integration mismatches ✅
```

**Good pattern: Active collaboration during parallel work**
```
API agent: "I need to add a field to the Appointment model — messaging the lead"
Lead: "Approved. Schema agent, add 'reminderSentAt' to Appointment. Web UI agent, the response now includes this field."
Schema agent: "Done, regenerating Prisma client"
```

## Task Management

Create a shared task list. Since contracts are defined upfront, agents can start building immediately.

```
[ ] Schema agent: Add new Prisma models + Zod validators + run db:generate
[ ] API agent: Implement API routes + lib utilities
[ ] Web UI agent: Build dashboard pages + public pages + components
[ ] All agents: Integration testing (blocked by all implementation tasks)
```

## Common Pitfalls to Prevent (NailBook-Specific)

1. **File conflicts**: Two agents editing the same file → Assign clear ownership per the boundary table
2. **Lead over-implementing**: You start coding → Stay in Delegate Mode
3. **Breaking existing features**: Agent rewrites a working page → Require agents to READ existing code first
4. **Raw Tailwind grays**: Agent uses `bg-gray-100` → Must use design tokens (`bg-background`, `bg-border`, etc.)
5. **Module-level service init**: Agent writes `const stripe = new Stripe(...)` at top level → Must use lazy getter pattern
6. **Missing `force-dynamic`**: Agent creates API route without `export const dynamic = "force-dynamic"` → Build fails
7. **Dollar floats**: Agent stores `price: 25.00` → Must be `priceInCents: 2500`
8. **Cross-provider data leak**: Agent query missing `where: { providerId }` → Security violation
9. **Missing event logging**: Agent changes appointment status without creating AppointmentEvent → Violates architecture invariant
10. **Ignoring spec files**: Agent invents a feature not in claude.md → Out of scope, must be flagged

## Definition of Done

The build is complete when:
1. All agents report their work is done
2. Each agent has validated their own domain
3. TypeScript compiles cleanly: `cd apps/web && npx tsc --noEmit`
4. Prisma schema is valid: `cd packages/db && npx prisma validate`
5. Integration points have been tested
6. Cross-review feedback has been addressed
7. The plan's acceptance criteria are met
8. No existing features from FEATURES.md are broken
9. **Lead agent has run end-to-end validation**

---

## Step 7: Validation

### Agent Validation

**Schema agent** validates:
- `cd packages/db && npx prisma validate`
- `cd packages/db && npx prisma generate`
- Zod schemas compile: `cd packages/shared && npx tsc --noEmit`

**API agent** validates:
- TypeScript compiles: `cd apps/web && npx tsc --noEmit`
- All new routes have `export const dynamic = "force-dynamic"`
- All routes follow `{ data }` / `{ error }` response envelope
- All protected routes check auth via Clerk
- All public routes have rate limiting

**Web UI agent** validates:
- TypeScript compiles: `cd apps/web && npx tsc --noEmit`
- Page components have explicit return types (`: React.JSX.Element` or `: Promise<React.JSX.Element>`)
- No raw gray Tailwind classes — only design tokens
- Loading skeletons on all pages
- Empty states follow the established pattern

**Mobile agent** validates:
- TypeScript compiles: `cd apps/mobile && npx tsc --noEmit`
- Expo config valid

**Worker agent** validates:
- TypeScript compiles: `cd apps/worker && npx tsc --noEmit`
- Job handlers follow existing patterns

### Lead Validation (End-to-End)

After ALL agents return:

1. **Schema**: `cd packages/db && npx prisma validate && npx prisma generate`
2. **Shared**: `cd packages/shared && npx tsc --noEmit`
3. **Web**: `cd apps/web && npx tsc --noEmit`
4. **Build**: `cd /path/to/nailbook && pnpm build` (if feasible)
5. **Existing features**: Spot-check 3-5 existing pages/routes haven't regressed
6. **New features**: Walk through the plan's acceptance criteria

If validation fails, re-spawn the relevant agent with the specific issue.

---

## Execute

Now read the plan at `$ARGUMENTS[0]` and begin:

1. Read and understand the plan
2. Read `CLAUDE.md`, `docs/product-spec.md`, `docs/architecture.md`, `docs/ui-guidelines.md`, `FEATURES.md`, `README.md`
3. Determine team size (use `$ARGUMENTS[1]` if provided, otherwise decide)
4. Define agent roles, ownership, cross-cutting concern assignments, and validation requirements
5. Map the contract chain and define all integration contracts from the plan
6. Enter Delegate Mode (Shift+Tab)
7. Spawn all agents in parallel with contracts, project context files, and validation checklists
8. Monitor agents, relay messages, mediate contract deviations
9. Run contract diff before integration
10. When all agents return, run end-to-end validation yourself
11. Confirm the build meets the plan's requirements and nothing existing is broken
