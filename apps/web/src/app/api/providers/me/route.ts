import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { invalidateAllAvailability } from "@/lib/cache";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

async function getProviderForUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { provider: true },
  });
  return user ? { provider: user.provider, avatarUrl: user.avatarUrl } : null;
}

// GET /api/providers/me — current user's provider profile
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await getProviderForUser(userId);
  if (!result?.provider) return error("Not a provider", 403);

  return success({ ...result.provider, avatarUrl: result.avatarUrl });
}

// PATCH /api/providers/me — update current user's provider profile + settings
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await getProviderForUser(userId);
  if (!result?.provider) return error("Not a provider", 403);

  const body = await request.json();

  // Pick only allowed fields to prevent overwriting sensitive data
  const profileFields = [
    "businessName", "bio", "locationAddress",
    "locationLat", "locationLng",
    "instagramUrl", "tiktokUrl",
    "category",
  ] as const;
  const settingsFields = [
    "acceptsCard", "acceptsApplePay", "acceptsGooglePay",
    "acceptsCashAppPay", "acceptsCash",
    "cancellationHours", "arrivalGraceMinutes",
    "booksOpen", "booksOpenAt", "bookingWindowDays",
    "bufferMinutes",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of profileFields) {
    if (key in body) data[key] = body[key];
  }
  for (const key of settingsFields) {
    if (key in body) data[key] = body[key];
  }

  // Sanitize free-text inputs to prevent XSS
  if (typeof data.businessName === "string") data.businessName = sanitizeText(data.businessName);
  if (typeof data.bio === "string") data.bio = sanitizeText(data.bio);
  if (typeof data.locationAddress === "string") data.locationAddress = sanitizeText(data.locationAddress);

  if (Object.keys(data).length === 0) {
    return error("No valid fields provided");
  }

  // Convert booksOpenAt string to Date for Prisma
  if ("booksOpenAt" in data) {
    data.booksOpenAt = data.booksOpenAt ? new Date(data.booksOpenAt as string) : null;
  }

  try {
    const updated = await prisma.provider.update({
      where: { id: result.provider.id },
      data,
    });

    // Invalidate availability cache when booking-related settings change
    const bookingFields = ["booksOpen", "booksOpenAt", "bookingWindowDays", "bufferMinutes"];
    if (bookingFields.some((f) => f in data)) {
      await invalidateAllAvailability(result.provider.id);
    }

    return success(updated);
  } catch (e) {
    console.error("[providers/me] Update failed:", e);
    return error("Failed to update profile", 500);
  }
}
