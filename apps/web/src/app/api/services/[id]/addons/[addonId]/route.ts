import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; addonId: string }> };

// PATCH /api/services/:id/addons/:addonId — update add-on
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id: serviceId, addonId } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return error("Service not found", 404);
  if (service.providerId !== user.provider.id) return error("Forbidden", 403);

  const addon = await prisma.addOn.findUnique({ where: { id: addonId } });
  if (!addon || addon.serviceId !== serviceId) return error("Add-on not found", 404);

  const body = await request.json();
  const allowedFields = ["name", "priceInCents", "durationMinutes", "isActive"] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.addOn.update({
    where: { id: addonId },
    data,
  });

  return success(updated);
}
