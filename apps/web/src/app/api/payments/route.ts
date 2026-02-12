import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/payments — transaction ledger for provider
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);

  const where: Record<string, unknown> = { providerId: user.provider.id };
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            service: { select: { name: true } },
            client: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({ where }),
  ]);

  return success({ payments, total });
}
