import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createAddOnGroupSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/services/:id/addon-groups — create add-on group for service
export async function POST(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id: serviceId } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return error("Service not found", 404);
  if (service.providerId !== user.provider.id) return error("Forbidden", 403);

  const result = await parseBody(request, createAddOnGroupSchema);
  if (result.error) return result.error;

  const group = await prisma.addOnGroup.create({
    data: {
      ...result.data,
      serviceId,
    },
  });

  return success(group, 201);
}
