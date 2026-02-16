import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/clients/:id — client detail with appointment history
export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const client = await prisma.providerClient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          service: { select: { name: true } },
          addOns: { select: { name: true, priceInCents: true } },
        },
        orderBy: { startTime: "desc" },
      },
    },
  });

  if (!client || client.providerId !== user.provider.id) {
    return error("Client not found", 404);
  }

  return success({ ...client, providerTimezone: user.provider.timezone });
}

// PATCH /api/clients/:id — update client notes (provider-only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const client = await prisma.providerClient.findUnique({ where: { id } });
  if (!client || client.providerId !== user.provider.id) {
    return error("Client not found", 404);
  }

  const body = await request.json();
  const allowedFields = ["notes", "name", "phone"] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.providerClient.update({
    where: { id },
    data,
  });

  return success(updated);
}
