# Porobook background worker (BullMQ). Built from the REPO ROOT so workspace
# packages (@nailbook/db, @nailbook/shared) are available:
#   docker build -f apps/worker/Dockerfile .
# Railway: railway.json at the repo root points here.
FROM node:22-slim
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Only the worker and its workspace deps (skips web + mobile).
RUN pnpm install --frozen-lockfile --filter worker...
RUN pnpm --filter @nailbook/db exec prisma generate

ENV NODE_ENV=production
# @nailbook/db and @nailbook/shared resolve to TypeScript sources, so the
# worker runs under tsx instead of a tsc build.
CMD ["pnpm", "--filter", "worker", "start"]
