# Porobook local development setup

Use this to get a second machine (laptop, PC) running the codebase. Secrets are never in git, so step 3 is a manual copy.

## 1. Prerequisites

- Node 22 (`node -v`)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Git with SSH access to `github.com:hivenodee/NailBook_App`
- Local Redis for the worker and reminder queue (`brew install redis` on Mac, Memurai or WSL `redis-server` on Windows)
- Optional: Stripe CLI (`stripe login`) for local webhooks, Docker if you want to build the worker image

## 2. Clone and install

```bash
git clone git@github.com:hivenodee/NailBook_App.git nailbook
cd nailbook
pnpm install
pnpm --filter @nailbook/db exec prisma generate
```

Set your commit identity to the Vercel team owner's email. The Hobby plan rejects deploys whose commits are authored by anyone else.

```bash
git config user.email justiceheughan16@gmail.com
git config user.name "Justice Heughn"
```

## 3. Environment files (copy from the Mac, never commit)

Two files hold every secret. Copy them from the Mac over AirDrop, a password manager, or an encrypted note:

| From the Mac | To the new machine |
|---|---|
| `apps/web/.env.local` | `apps/web/.env.local` |
| `apps/worker/.env` | `apps/worker/.env` |

Templates with every variable explained are in `apps/web/.env.local.example` and `apps/worker/.env.example`. Both apps point at the same Neon database as production right now, so be careful with destructive Prisma commands. Never pass the real database as a shadow database.

On Windows, change the queue and worker Redis URLs if your Redis is not on `localhost:6379`.

## 4. Run everything

Four processes, each in its own terminal from the repo root:

```bash
pnpm --filter web dev                      # http://localhost:3000
pnpm --filter worker dev                   # BullMQ worker (needs local Redis)
pnpm --filter @nailbook/db exec prisma studio   # http://localhost:5555
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # copy the whsec_ into apps/web/.env.local
```

If the web app shows `MODULE_NOT_FOUND` after a production build, delete `apps/web/.next` and start dev again.

## 5. Daily workflow between machines

```bash
git pull --rebase origin main     # before you start
# ...work...
pnpm --filter web exec tsc --noEmit
git add -A && git commit -m "..."
git push origin main
```

Production deploys are manual until the Vercel GitHub app is installed:

```bash
npx vercel link      # once per machine, from the REPO ROOT, pick project "porobook"
npx vercel deploy --prod --yes
```

The Vercel CLI needs `npx vercel login` once per machine. Environment variables live in Vercel, not in git; list them with `npx vercel env ls production`.

## 6. Schema changes

Migrations are the source of truth. Use `prisma migrate dev` (not `db push`) from `packages/db`, commit the migration folder, and production picks it up through `prisma migrate deploy`. Reseed a dev dataset with `pnpm --filter @nailbook/db seed`.

## 7. Where things are documented

- `docs/launch-playbook.md`: launch checklist and current status block
- `docs/product-spec.md`: V1 scope
- `docs/architecture.md`: data model and invariants
- `FEATURES.md`: what is already built
- `CLAUDE.md`: coding rules every change must follow
