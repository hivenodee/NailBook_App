import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/providers/me/stripe/status
//
// Polls Stripe for the current Connect Standard account state and writes
// `stripeChargesEnabled` / `stripePayoutsEnabled` / `stripeOnboardedAt` back
// to the provider record. The webhook handler does this asynchronously, but
// after the provider returns from Stripe we want to show fresh status
// immediately — webhooks can lag.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const provider = user.provider;

  if (!provider.stripeAccountId) {
    return success({
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: false,
    });
  }

  const account = await stripe.accounts.retrieve(provider.stripeAccountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;
  const requirementsDue =
    (account.requirements?.currently_due?.length ?? 0) > 0 ||
    (account.requirements?.past_due?.length ?? 0) > 0;

  // Only set stripeOnboardedAt once — when details are submitted for the
  // first time. After that, leave it as the original timestamp so we can
  // measure time-to-go-live cleanly.
  const updates: {
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    stripeOnboardedAt?: Date;
  } = {
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
  };
  if (detailsSubmitted && !provider.stripeOnboardedAt) {
    updates.stripeOnboardedAt = new Date();
  }

  await prisma.provider.update({
    where: { id: provider.id },
    data: updates,
  });

  return success({
    connected: true,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    requirementsDue,
  });
}
