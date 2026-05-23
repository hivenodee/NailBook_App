# Porobook Deployment Guide

Step-by-step instructions to go from zero to a running production deployment.

For the full pre-deploy checklist, see [deployment-checklist.md](./deployment-checklist.md).

---

## Prerequisites

- Node.js 22+
- pnpm 9.15+
- Accounts: Neon (database), Clerk (auth), Stripe (payments), Vercel (hosting)

---

## Step 1: Database (Neon)

1. Create a project at https://console.neon.tech/
2. Copy the connection string (the `postgresql://...` URL)
3. Set it as `DATABASE_URL` in your environment
4. Run migrations:
   ```bash
   pnpm --filter @nailbook/db exec prisma migrate deploy
   ```

---

## Step 2: Auth (Clerk)

1. Create an application at https://dashboard.clerk.com/
2. Copy the API keys:
   - Publishable Key -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret Key -> `CLERK_SECRET_KEY`
3. Configure social login providers (Google, Apple) in the Clerk dashboard if desired
4. Add your production domain to the allowed redirect URLs

---

## Step 3: Payments (Stripe)

1. Get API keys from https://dashboard.stripe.com/apikeys
   - Secret Key -> `STRIPE_SECRET_KEY`
   - Publishable Key -> `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
2. Create a webhook endpoint in the Stripe dashboard:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to subscribe to:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `charge.refunded`
3. Copy the webhook signing secret -> `STRIPE_WEBHOOK_SECRET`
4. For local development, use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

---

## Step 4: Email (Resend) -- Optional

1. Sign up at https://resend.com/
2. Add and verify your sender domain
3. Create an API key -> `RESEND_API_KEY`
4. Set `EMAIL_FROM=noreply@yourdomain.com` (must match your verified domain)

Without Resend configured, emails are logged to the server console instead of sent.

---

## Step 5: SMS (Twilio) -- Optional

1. Sign up at https://console.twilio.com/
2. Get a phone number capable of sending SMS
3. Copy credentials:
   - Account SID -> `TWILIO_ACCOUNT_SID`
   - Auth Token -> `TWILIO_AUTH_TOKEN`
   - Phone Number -> `TWILIO_FROM_NUMBER` (in E.164 format, e.g., `+15551234567`)

Without Twilio configured, SMS messages are logged to the server console instead of sent.

---

## Step 6: Cache (Upstash Redis) -- Recommended

1. Create a Redis database at https://console.upstash.com/
2. Copy the REST credentials:
   - REST URL -> `REDIS_URL`
   - REST Token -> `REDIS_TOKEN`
3. This enables:
   - Rate limiting on public API endpoints
   - Availability slot caching (300s TTL with invalidation)
   - Background job queues (BullMQ)

Without Redis configured, rate limiting is disabled and availability is served uncached.

---

## Step 7: Storage (Cloudflare R2) -- Optional

1. Create an R2 bucket at https://dash.cloudflare.com/ (e.g., `porobook-media`)
2. Enable public access on the bucket (or connect a custom domain)
3. Configure CORS on the bucket:
   - Allowed Origins: `https://yourdomain.com`
   - Allowed Methods: `GET`, `PUT`
   - Allowed Headers: `Content-Type`
4. Create an R2 API token with Object Read & Write permissions
5. Set environment variables:
   - `R2_ACCOUNT_ID` -- your Cloudflare account ID (from dashboard URL)
   - `R2_ACCESS_KEY_ID` -- from the API token
   - `R2_SECRET_ACCESS_KEY` -- from the API token
   - `R2_BUCKET_NAME` -- your bucket name (e.g., `porobook-media`)
   - `R2_PUBLIC_URL` -- the public URL for your bucket (e.g., `https://pub-xxx.r2.dev`)

Without R2 configured, portfolio uploads are disabled.

---

## Step 8: Monitoring (Sentry) -- Optional

1. Create a Next.js project at https://sentry.io/
2. Copy the DSN -> `NEXT_PUBLIC_SENTRY_DSN`
3. For source map uploads, also set:
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`

Without Sentry configured, errors are logged to the console only.

---

## Step 9: Deploy to Vercel

1. Connect your GitHub repo at https://vercel.com/
2. Set the root directory to `apps/web`
3. Set the build command to `pnpm build`
4. Add all environment variables from your `.env.local` to the Vercel project settings
   - Use production/live keys, not test keys
5. Deploy

### Vercel Environment Variable Notes

- `NEXT_PUBLIC_APP_URL` must be your production URL (e.g., `https://porobook.app`)
- Stripe keys should be live mode keys (start with `sk_live_` and `pk_live_`)
- The `STRIPE_WEBHOOK_SECRET` must match the webhook endpoint registered for your production URL

---

## Step 10: Post-Deploy Verification

1. Visit your app URL -- confirm the landing page loads
2. Visit `/:slug` -- confirm a provider profile page loads (use your test provider slug)
3. Test the full booking flow with Stripe test mode:
   - Select a service
   - Pick a date and time
   - Complete checkout with test card `4242 4242 4242 4242`
   - Verify the confirmation page shows success
4. Check Stripe webhook delivery in the dashboard -- confirm events are received
5. Send a test email and SMS to verify delivery
6. Upload a portfolio image to verify R2 storage
7. Run the automated check: `pnpm prelaunch`

---

## Stripe Testing

- **Test card**: `4242 4242 4242 4242`, any future expiry, any CVC
- **Declined card**: `4000 0000 0000 0002`
- **3D Secure card**: `4000 0025 0000 3155`
- **Stripe CLI** for local webhook forwarding:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
  Copy the `whsec_...` secret printed by the CLI into `STRIPE_WEBHOOK_SECRET`.

---

## Troubleshooting

### Build fails with missing env vars

External service clients (Stripe, Redis, S3, Resend, Twilio) use lazy initialization. If you see errors about undefined env vars during build, ensure all `[REQUIRED]` variables are set in your deployment environment.

### Stale cache after build

After a production build, always clear the `.next` directory before running dev:
```bash
rm -rf apps/web/.next && pnpm dev
```

### Prisma client not generated

If you see `PrismaClientInitializationError`, run:
```bash
pnpm db:generate
```

### Webhooks not arriving

1. Verify the webhook URL matches your production URL exactly
2. Check that the signing secret matches
3. In Stripe dashboard, check the webhook event logs for delivery status
4. Ensure `checkout.session.completed` and `checkout.session.expired` events are enabled

### Database migrations

- **Development**: `pnpm db:migrate` (runs `prisma migrate dev`)
- **Production**: `pnpm --filter @nailbook/db exec prisma migrate deploy`
- **Existing database**: Mark baseline as applied first:
  ```bash
  pnpm --filter @nailbook/db exec prisma migrate resolve --applied 0001_baseline
  ```
