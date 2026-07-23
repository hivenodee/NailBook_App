/**
 * Stripe Connect helpers shared by the deposit, balance, and tip checkout
 * routes. We're on **Connect Standard** with direct charges — the platform
 * creates checkout sessions on the connected account and takes a cut via
 * `application_fee_amount`.
 *
 * During beta we charge nothing (`PLATFORM_FEE_BPS = 0`); the parameter lives
 * here so we can flip it on without hunting through three checkout routes.
 *
 * Connected account events arrive at the platform webhook only when the
 * webhook endpoint is configured in the Stripe dashboard with "Listen to
 * events on Connected accounts" enabled.
 */

/** Platform fee in basis points (1 BPS = 0.01%). 0 = free during beta. */
export const PLATFORM_FEE_BPS = 0;

/** True when a provider is ready to accept card payments via Connect. */
export function canChargeCard(provider: {
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
}): boolean {
  return !!provider.stripeAccountId && provider.stripeChargesEnabled;
}

/** Application fee in cents for a given charge amount. Floors to integer. */
export function applicationFeeCents(amountInCents: number, bps = PLATFORM_FEE_BPS): number {
  if (bps <= 0) return 0;
  return Math.floor((amountInCents * bps) / 10_000);
}

/**
 * Build the connect-specific args to spread into `stripe.checkout.sessions.create(...)`
 * and the request options to spread into the second positional arg.
 *
 * Direct charges: pass `stripeAccount` in the request options so the session
 * is created on the connected account itself. Application fee is optional.
 */
export function checkoutConnectArgs(provider: {
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
}, amountInCents: number) {
  if (!canChargeCard(provider)) {
    return { params: {}, options: {} as Record<string, never> };
  }

  const fee = applicationFeeCents(amountInCents);
  const params = fee > 0
    ? { payment_intent_data: { application_fee_amount: fee } }
    : {};
  const options = { stripeAccount: provider.stripeAccountId! };
  return { params, options };
}
