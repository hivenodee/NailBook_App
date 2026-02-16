import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/services/:id — single service with provider info + all add-ons
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      addOns: includeAll
        ? { orderBy: { sortOrder: "asc" } }
        : { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      addOnGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          addOns: includeAll
            ? { orderBy: { sortOrder: "asc" } }
            : { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      provider: {
        select: {
          businessName: true,
          slug: true,
          timezone: true,
          cancellationHours: true,
          arrivalGraceMinutes: true,
          acceptsCard: true,
          acceptsApplePay: true,
          acceptsGooglePay: true,
          acceptsCashAppPay: true,
          acceptsCash: true,
          booksOpen: true,
          booksOpenAt: true,
          bookingWindowDays: true,
        },
      },
    },
  });

  if (!service) return error("Service not found", 404);
  return success(service);
}

// PATCH /api/services/:id — update service (provider only)
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return error("Service not found", 404);
  if (service.providerId !== user.provider.id) return error("Forbidden", 403);

  const body = await request.json();
  const allowedFields = [
    "name", "description", "priceInCents", "durationMinutes",
    "depositType", "depositValue", "isActive", "sortOrder",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.service.update({
    where: { id },
    data,
    include: { addOns: { orderBy: { createdAt: "asc" } } },
  });

  return success(updated);
}
