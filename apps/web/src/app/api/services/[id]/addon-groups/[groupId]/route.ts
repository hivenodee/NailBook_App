import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; groupId: string }> };

// PATCH /api/services/:id/addon-groups/:groupId — update group
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id: serviceId, groupId } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return error("Service not found", 404);
  if (service.providerId !== user.provider.id) return error("Forbidden", 403);

  const group = await prisma.addOnGroup.findUnique({ where: { id: groupId } });
  if (!group || group.serviceId !== serviceId) return error("Group not found", 404);

  const body = await request.json();
  const allowedFields = ["name", "sortOrder", "rule"] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.addOnGroup.update({
    where: { id: groupId },
    data,
  });

  return success(updated);
}

// DELETE /api/services/:id/addon-groups/:groupId — delete group, orphan add-ons
export async function DELETE(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id: serviceId, groupId } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return error("Service not found", 404);
  if (service.providerId !== user.provider.id) return error("Forbidden", 403);

  const group = await prisma.addOnGroup.findUnique({ where: { id: groupId } });
  if (!group || group.serviceId !== serviceId) return error("Group not found", 404);

  // Orphan child add-ons, then delete group
  await prisma.$transaction([
    prisma.addOn.updateMany({
      where: { groupId },
      data: { groupId: null },
    }),
    prisma.addOnGroup.delete({ where: { id: groupId } }),
  ]);

  return success({ deleted: true });
}
