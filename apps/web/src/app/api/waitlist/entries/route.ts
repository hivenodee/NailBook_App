import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/waitlist/entries — list waitlist entries for current provider
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const providerId = user.provider.id;
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;

  // Auto-expire past-date entries
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.waitlistEntry.updateMany({
    where: {
      providerId,
      targetDate: { lt: today },
      status: { in: ["ACTIVE", "AVAILABLE", "NOTIFIED"] },
    },
    data: { status: "EXPIRED" },
  });

  const where = {
    providerId,
    ...(statusFilter ? { status: statusFilter as never } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      include: {
        service: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return success({
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
