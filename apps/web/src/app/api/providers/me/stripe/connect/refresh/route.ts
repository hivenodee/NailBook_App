import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// GET /api/providers/me/stripe/connect/refresh
//
// Stripe redirects providers here when their AccountLink expires mid-flow.
// We mint a fresh AccountLink and bounce them back to Stripe.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    );
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  const provider = user?.provider;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!provider?.stripeAccountId) {
    return NextResponse.redirect(new URL("/dashboard/payouts/return", origin));
  }

  const link = await stripe.accountLinks.create({
    account: provider.stripeAccountId,
    refresh_url: `${origin}/api/providers/me/stripe/connect/refresh`,
    return_url: `${origin}/dashboard/payouts/return`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(link.url);
}
