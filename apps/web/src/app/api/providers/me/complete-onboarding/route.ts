import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// POST /api/providers/me/complete-onboarding
//
// Flips `onboardedAt` on the provider after the wizard's final step and
// denormalizes a thin `onboarded` flag into Clerk publicMetadata so the
// Edge middleware can gate `/dashboard` without a DB hit.
//
// Idempotent — re-posting after the wizard finishes returns the existing
// timestamp without touching anything.
//
// Guards: provider must have at least one active service and one
// availability rule. These are wizard steps 4 and 5; bypassing the UI
// shouldn't be able to "complete" onboarding with a half-built profile.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      provider: {
        include: {
          _count: { select: { services: true, availabilityRules: true } },
        },
      },
    },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const provider = user.provider;

  if (provider.onboardedAt) {
    return success({ onboardedAt: provider.onboardedAt, slug: provider.slug });
  }

  if (provider._count.services < 1) {
    return error("Add at least one service before going live", 400);
  }
  if (provider._count.availabilityRules < 1) {
    return error("Set your hours before going live", 400);
  }

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: { onboardedAt: new Date() },
    select: { onboardedAt: true, slug: true },
  });

  // Denormalize to Clerk so middleware can gate at the Edge without a DB read.
  // Best-effort — if Clerk is down we still want the provider's local state
  // to reflect "live." The middleware will fall back to the DB-backed flag
  // on the next request anyway.
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboarded: true,
        providerSlug: provider.slug,
        providerId: provider.id,
      },
    });
  } catch (e) {
    console.error("[complete-onboarding] Clerk metadata update failed:", e);
  }

  return success(updated);
}
