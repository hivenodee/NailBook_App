import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/providers/:id/reviews — Public reviews (no auth)
// Note: `id` can be either a provider ID or a slug
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Try slug first, fall back to id
  const provider = await prisma.provider.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    select: { id: true },
  });
  if (!provider) return error("Provider not found", 404);

  const reviews = await prisma.feedback.findMany({
    where: { providerId: provider.id, isPublic: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      appointment: {
        select: {
          service: { select: { name: true } },
        },
      },
    },
  });

  const rated = reviews.filter((r) => r.rating !== null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, r) => sum + r.rating!, 0) / rated.length
      : null;

  return success({
    reviews,
    avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
    count: reviews.length,
  });
}
