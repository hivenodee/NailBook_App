import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createProviderSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

// GET /api/providers — discovery feed (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const offset = Number(searchParams.get("offset") || 0);

  const providers = await prisma.provider.findMany({
    take: limit,
    skip: offset,
    include: {
      user: { select: { firstName: true, avatarUrl: true } },
      services: {
        where: { isActive: true },
        take: 3,
        orderBy: { sortOrder: "asc" },
      },
      mediaAssets: {
        where: { type: "PHOTO" },
        take: 4,
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return success(providers);
}

// POST /api/providers — create provider profile (auth required)
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, createProviderSchema);
  if (result.error) return result.error;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return error("User not found", 404);

  const existing = await prisma.provider.findUnique({
    where: { slug: result.data.slug },
  });
  if (existing) return error("Slug already taken", 409);

  const provider = await prisma.provider.create({
    data: {
      ...result.data,
      userId: user.id,
    },
  });

  return success(provider, 201);
}
