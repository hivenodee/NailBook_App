import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/coupons/validate — public endpoint to validate a coupon during booking
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const body = await request.json();
  const { code, slug, serviceId } = body as {
    code?: string;
    slug?: string;
    serviceId?: string;
  };

  if (!code || !slug || !serviceId) {
    return error("code, slug, and serviceId are required", 400);
  }

  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) return error("Provider not found", 404);

  const coupon = await prisma.coupon.findUnique({
    where: { providerId_code: { providerId: provider.id, code: code.toUpperCase().trim() } },
    include: { services: { select: { id: true } } },
  });

  if (!coupon || !coupon.isActive) {
    return success({ valid: false, reason: "Invalid coupon code" });
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return success({ valid: false, reason: "This coupon has expired" });
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return success({ valid: false, reason: "This coupon has been fully redeemed" });
  }

  // Check service restriction
  if (coupon.services.length > 0) {
    const applies = coupon.services.some((s) => s.id === serviceId);
    if (!applies) {
      return success({ valid: false, reason: "This coupon doesn't apply to this service" });
    }
  }

  return success({
    valid: true,
    type: coupon.type,
    value: coupon.value,
    code: coupon.code,
  });
}
