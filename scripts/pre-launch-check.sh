#!/bin/bash
# NailBook Pre-Launch Checklist
# Run this before deploying to production to verify everything is configured.
#
# Usage:
#   pnpm prelaunch
#   # or directly:
#   bash scripts/pre-launch-check.sh

set -e

PASS="[PASS]"
FAIL="[FAIL]"
WARN="[WARN]"
errors=0
warnings=0

echo ""
echo "========================================="
echo "  NailBook Pre-Launch Check"
echo "========================================="
echo ""

# Check if .env.local exists
if [ -f "apps/web/.env.local" ]; then
  set -a
  source apps/web/.env.local
  set +a
  echo "$PASS .env.local found"
else
  echo "$FAIL .env.local not found — copy from .env.local.example"
  errors=$((errors + 1))
fi

echo ""
echo "--- Required Services ---"

# Database
if [ -n "$DATABASE_URL" ]; then
  echo "$PASS Database URL configured"
else
  echo "$FAIL DATABASE_URL not set"
  errors=$((errors + 1))
fi

# Clerk
if [ -n "$CLERK_SECRET_KEY" ] && [ -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
  echo "$PASS Clerk auth configured"
else
  echo "$FAIL Clerk keys not set (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
  errors=$((errors + 1))
fi

# Stripe
if [ -n "$STRIPE_SECRET_KEY" ] && [ -n "$NEXT_PUBLIC_STRIPE_PUBLIC_KEY" ]; then
  echo "$PASS Stripe keys configured"
else
  echo "$FAIL Stripe keys not set (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLIC_KEY)"
  errors=$((errors + 1))
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "$PASS Stripe webhook secret configured"
else
  echo "$FAIL STRIPE_WEBHOOK_SECRET not set — webhooks won't verify"
  errors=$((errors + 1))
fi

# App URL
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
  if [[ "$NEXT_PUBLIC_APP_URL" == *"localhost"* ]]; then
    echo "$WARN NEXT_PUBLIC_APP_URL is still localhost — update for production"
    warnings=$((warnings + 1))
  else
    echo "$PASS App URL configured: $NEXT_PUBLIC_APP_URL"
  fi
else
  echo "$FAIL NEXT_PUBLIC_APP_URL not set"
  errors=$((errors + 1))
fi

echo ""
echo "--- Optional Services ---"

# Email
if [ -n "$RESEND_API_KEY" ]; then
  echo "$PASS Email (Resend) configured"
else
  echo "$WARN RESEND_API_KEY not set — emails will log to console instead"
  warnings=$((warnings + 1))
fi

# SMS
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ] && [ -n "$TWILIO_FROM_NUMBER" ]; then
  echo "$PASS SMS (Twilio) configured"
else
  echo "$WARN Twilio not fully configured — SMS will log to console instead"
  warnings=$((warnings + 1))
fi

# Redis
if [ -n "$REDIS_URL" ] && [ -n "$REDIS_TOKEN" ]; then
  echo "$PASS Redis (Upstash) configured"
else
  echo "$WARN Redis not configured — no rate limiting, no availability caching"
  warnings=$((warnings + 1))
fi

# Storage
if [ -n "$R2_ACCOUNT_ID" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ] && [ -n "$R2_BUCKET_NAME" ]; then
  echo "$PASS Storage (R2) configured"
else
  echo "$WARN R2 storage not configured — portfolio uploads won't work"
  warnings=$((warnings + 1))
fi

# Sentry
if [ -n "$NEXT_PUBLIC_SENTRY_DSN" ]; then
  echo "$PASS Sentry monitoring configured"
else
  echo "$WARN NEXT_PUBLIC_SENTRY_DSN not set — no error monitoring"
  warnings=$((warnings + 1))
fi

echo ""
echo "--- Build & Database ---"

# Check if node_modules exist
if [ -d "node_modules" ]; then
  echo "$PASS node_modules installed"
else
  echo "$FAIL node_modules not found — run: pnpm install"
  errors=$((errors + 1))
fi

# Check if Prisma client is generated
if [ -d "node_modules/.prisma/client" ]; then
  echo "$PASS Prisma client generated"
else
  echo "$FAIL Prisma client not generated — run: pnpm db:generate"
  errors=$((errors + 1))
fi

# Check if the app builds
echo "  Building app (this may take a minute)..."
if pnpm --filter web build > /dev/null 2>&1; then
  echo "$PASS Web app builds successfully"
else
  echo "$FAIL Web app build failed — run: pnpm --filter web build"
  errors=$((errors + 1))
fi

echo ""
echo "========================================="
if [ $errors -gt 0 ]; then
  echo "  $FAIL $errors error(s), $warnings warning(s)"
  echo "  Fix errors before deploying!"
  echo "========================================="
  exit 1
else
  echo "  $PASS All checks passed! ($warnings warning(s))"
  echo "  Ready to deploy."
  echo "========================================="
  exit 0
fi
