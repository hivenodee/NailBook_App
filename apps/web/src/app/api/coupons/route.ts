import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody, withErrorHandler } from "@/lib/api-utils";
import { createCouponSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

// GET /api/coupons — list coupons for current provider
export const GET = withErrorHandler(async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Provider not found", 404);

  const coupons = await prisma.coupon.findMany({
    where: { providerId: user.provider.id },
    include: {
      services: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return success(coupons);
});

// POST /api/coupons — create a new coupon
export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Provider not found", 404);

  const result = await parseBody(request, createCouponSchema);
  if (result.error) return result.error;

  const { code, type, value, expiresAt, maxUses, serviceIds } = result.data;

  // Validate PERCENT <= 100
  if (type === "PERCENT" && value > 100) {
    return error("Percent discount cannot exceed 100", 400);
  }

  const normalizedCode = code.toUpperCase().trim();

  // Check uniqueness
  const existing = await prisma.coupon.findUnique({
    where: { providerId_code: { providerId: user.provider.id, code: normalizedCode } },
  });
  if (existing) return error("A coupon with this code already exists", 409);

  const coupon = await prisma.coupon.create({
    data: {
      providerId: user.provider.id,
      code: normalizedCode,
      type,
      value,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
      ...(serviceIds && serviceIds.length > 0 && {
        services: { connect: serviceIds.map((id) => ({ id })) },
      }),
    },
    include: {
      services: { select: { id: true, name: true } },
    },
  });

  return success(coupon, 201);
});
