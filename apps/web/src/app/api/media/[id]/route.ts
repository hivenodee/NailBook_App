import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/media/:id — toggle isHidden, update sortOrder
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return error("Media not found", 404);
  if (asset.providerId !== user.provider.id) return error("Forbidden", 403);

  const body = await request.json();
  const { isHidden, sortOrder } = body as {
    isHidden?: boolean;
    sortOrder?: number;
  };

  const data: Record<string, unknown> = {};
  if (typeof isHidden === "boolean") data.isHidden = isHidden;
  if (typeof sortOrder === "number") data.sortOrder = sortOrder;

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data,
  });

  return success(updated);
}

// DELETE /api/media/:id — hard delete
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return error("Media not found", 404);
  if (asset.providerId !== user.provider.id) return error("Forbidden", 403);

  await prisma.mediaAsset.delete({ where: { id } });

  return success({ deleted: true });
}
