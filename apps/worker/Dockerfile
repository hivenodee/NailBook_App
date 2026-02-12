FROM node:20-slim AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker build
RUN pnpm --filter @nailbook/db exec prisma generate

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/packages/db ./packages/db

ENV NODE_ENV=production
CMD ["node", "apps/worker/dist/index.js"]
