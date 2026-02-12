import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/services/:id — single service with provider info
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      addOns: { where: { isActive: true } },
      provider: {
        select: {
          businessName: true,
          slug: true,
          cancellationHours: true,
          arrivalGraceMinutes: true,
          acceptsCard: true,
          acceptsApplePay: true,
          acceptsGooglePay: true,
          acceptsCashAppPay: true,
          acceptsCash: true,
        },
      },
    },
  });

  if (!service) return error("Service not found", 404);
  return success(service);
}
