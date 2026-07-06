import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// POST /api/providers/me/stripe/connect
//
// Returns a fresh Stripe Connect AccountLink URL for the current provider.
// If they don't have a Standard account yet, one is created and persisted.
//
// AccountLink URLs are single-use and expire quickly (a few minutes), so this
// endpoint is called every time we need to send the provider to Stripe — not
// stored anywhere.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const provider = user.provider;

  let accountId = provider.stripeAccountId;

  if (!accountId) {
    const clerkProfile = await currentUser();
    const email =
      clerkProfile?.emailAddresses[0]?.emailAddress ?? user.email ?? undefined;

    const account = await stripe.accounts.create({
      type: "standard",
      email,
      business_type: "individual",
      metadata: {
        providerId: provider.id,
        clerkId: userId,
      },
    });
    accountId = account.id;

    await prisma.provider.update({
      where: { id: provider.id },
      data: { stripeAccountId: accountId },
    });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/providers/me/stripe/connect/refresh`,
    return_url: `${origin}/dashboard/payouts/return`,
    type: "account_onboarding",
  });

  return success({ url: link.url });
}
