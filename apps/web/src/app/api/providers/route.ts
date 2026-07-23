import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createProviderSchema } from "@nailbook/shared";
import { normalizeSlug, validateSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

// GET /api/providers — discovery feed (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const offset = Number(searchParams.get("offset") || 0);

  const providers = await prisma.provider.findMany({
    take: limit,
    skip: offset,
    include: {
      user: { select: { firstName: true, avatarUrl: true } },
      services: {
        where: { isActive: true },
        take: 3,
        orderBy: { sortOrder: "asc" },
      },
      mediaAssets: {
        where: { type: "PHOTO" },
        take: 4,
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return success(providers);
}

// POST /api/providers — create provider profile (auth required)
//
// Idempotent: returning the existing provider when one already exists for this
// Clerk user lets the onboarding wizard re-submit step 2 without erroring out.
// Also upserts the User row + promotes role to PROVIDER, since fresh Clerk
// signups don't have a User record yet (only guest booking flow creates Users
// elsewhere in the system).
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, createProviderSchema);
  if (result.error) return result.error;

  // Defensive slug check — wizard already validates client-side, but the
  // endpoint is the source of truth.
  const normalizedSlug = normalizeSlug(result.data.slug);
  const slugReason = validateSlug(normalizedSlug);
  if (slugReason) return error(`Invalid slug: ${slugReason}`, 400);

  const clerkProfile = await currentUser();
  if (!clerkProfile) return error("Clerk profile not found", 404);

  const email = clerkProfile.emailAddresses[0]?.emailAddress;
  if (!email) return error("Email required on Clerk account", 400);

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      role: "PROVIDER",
      firstName: clerkProfile.firstName ?? undefined,
      lastName: clerkProfile.lastName ?? undefined,
      avatarUrl: clerkProfile.imageUrl ?? undefined,
    },
    create: {
      clerkId: userId,
      email,
      firstName: clerkProfile.firstName,
      lastName: clerkProfile.lastName,
      avatarUrl: clerkProfile.imageUrl,
      role: "PROVIDER",
    },
  });

  const existingProvider = await prisma.provider.findUnique({
    where: { userId: user.id },
  });
  if (existingProvider) return success(existingProvider, 200);

  const slugTaken = await prisma.provider.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });
  if (slugTaken) return error("Slug already taken", 409);

  const provider = await prisma.provider.create({
    data: {
      ...result.data,
      slug: normalizedSlug,
      userId: user.id,
    },
  });

  return success(provider, 201);
}
