import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { updateProviderSchema, providerSettingsSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/providers/:id
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { addOns: { where: { isActive: true } } },
      },
      mediaAssets: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!provider) return error("Provider not found", 404);
  return success(provider);
}

// PATCH /api/providers/:id — update profile or settings
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!provider) return error("Provider not found", 404);
  if (provider.user.clerkId !== userId) return error("Forbidden", 403);

  // Try parsing as profile update first, then settings
  const profileResult = await parseBody(request.clone(), updateProviderSchema);
  const settingsResult = await parseBody(request, providerSettingsSchema);

  const data = profileResult.data || settingsResult.data;
  if (!data) return profileResult.error || settingsResult.error!;

  const updated = await prisma.provider.update({
    where: { id },
    data,
  });

  return success(updated);
}
