import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, withErrorHandler } from "@/lib/api-utils";
import { rateLimit } from "@/lib/rate-limit";
import { providerSearchSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

const MILES_TO_KM = 1.60934;
const EARTH_RADIUS_KM = 6371;

function degToRad(deg: number) {
  return deg * (Math.PI / 180);
}

function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = degToRad(lat2 - lat1);
  const dLng = degToRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (EARTH_RADIUS_KM * c) / MILES_TO_KM;
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = providerSearchSchema.safeParse(params);
  if (!parsed.success) {
    return error("Invalid search parameters", 422);
  }

  const { category, lat, lng, radiusMiles, limit, offset } = parsed.data;
  const hasLocation = lat !== undefined && lng !== undefined;

  // Build WHERE clause
  const where: Record<string, unknown> = {
    locationLat: { not: null },
    locationLng: { not: null },
    services: { some: { isActive: true } },
  };

  if (category) {
    where.category = category;
  }

  // Bounding box filter when location provided
  if (hasLocation) {
    const radiusKm = radiusMiles * MILES_TO_KM;
    const latDelta = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI);
    const lngDelta =
      latDelta / Math.cos(degToRad(lat));

    where.locationLat = {
      gte: lat - latDelta,
      lte: lat + latDelta,
    };
    where.locationLng = {
      gte: lng - lngDelta,
      lte: lng + lngDelta,
    };
  }

  // Over-fetch 3x when filtering by radius to handle bounding box vs circle mismatch
  const fetchLimit = hasLocation ? limit * 3 : limit;

  const providers = await prisma.provider.findMany({
    where,
    select: {
      id: true,
      slug: true,
      businessName: true,
      category: true,
      locationAddress: true,
      locationLat: true,
      locationLng: true,
      isVerified: true,
      booksOpen: true,
      user: { select: { avatarUrl: true } },
      mediaAssets: {
        where: { isHidden: false, type: "PHOTO" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { thumbnailUrl: true, url: true },
      },
      feedback: {
        where: { isPublic: true, rating: { not: null } },
        select: { rating: true },
      },
      _count: { select: { services: { where: { isActive: true } } } },
      createdAt: true,
    },
    take: fetchLimit + offset,
    skip: 0,
    orderBy: hasLocation ? undefined : { createdAt: "desc" },
  });

  // Compute distance + haversine post-filter
  let results = providers.map((p) => {
    const avgRating =
      p.feedback.length > 0
        ? Math.round(
            (p.feedback.reduce((sum, f) => sum + (f.rating ?? 0), 0) /
              p.feedback.length) *
              10
          ) / 10
        : null;

    const firstMedia = p.mediaAssets[0];

    return {
      id: p.id,
      slug: p.slug,
      businessName: p.businessName,
      category: p.category,
      locationAddress: p.locationAddress,
      locationLat: p.locationLat,
      locationLng: p.locationLng,
      isVerified: p.isVerified,
      booksOpen: p.booksOpen,
      avatarUrl: p.user.avatarUrl,
      portfolioThumbnail: firstMedia?.thumbnailUrl || firstMedia?.url || null,
      avgRating,
      reviewCount: p.feedback.length,
      serviceCount: p._count.services,
      distance:
        hasLocation && p.locationLat !== null && p.locationLng !== null
          ? Math.round(
              haversineDistanceMiles(lat, lng, p.locationLat, p.locationLng) * 10
            ) / 10
          : null,
    };
  });

  // Haversine post-filter for exact circular radius
  if (hasLocation) {
    results = results.filter(
      (r) => r.distance !== null && r.distance <= radiusMiles
    );
    results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }

  // Apply offset + limit after filtering
  const paginated = results.slice(offset, offset + limit);

  return success({
    providers: paginated,
    total: results.length,
    hasMore: offset + limit < results.length,
  });
});
