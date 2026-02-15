import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createServiceSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

// GET /api/services?providerId=xxx&all=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  if (!providerId) return error("providerId is required");

  const includeAll = searchParams.get("all") === "true";

  const services = await prisma.service.findMany({
    where: { providerId, ...(includeAll ? {} : { isActive: true }) },
    include: {
      addOns: includeAll ? { orderBy: { createdAt: "asc" } } : { where: { isActive: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return success(services);
}

// POST /api/services — create service (provider only)
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, createServiceSchema);
  if (result.error) return result.error;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.create({
    data: {
      ...result.data,
      providerId: user.provider.id,
    },
  });

  return success(service, 201);
}
