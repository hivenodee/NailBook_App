import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/coupons/:id — toggle isActive
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Provider not found", 404);

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return error("Coupon not found", 404);
  if (coupon.providerId !== user.provider.id) return error("Forbidden", 403);

  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive: !coupon.isActive },
    include: {
      services: { select: { id: true, name: true } },
    },
  });

  return success(updated);
}
