import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// POST /api/exports — request a CSV export
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const body = await request.json();
  const { type } = body as { type: "CLIENTS" | "APPOINTMENTS" | "TRANSACTIONS" };

  if (!["CLIENTS", "APPOINTMENTS", "TRANSACTIONS"].includes(type)) {
    return error("Invalid export type");
  }

  const job = await prisma.exportJob.create({
    data: {
      providerId: user.provider.id,
      type,
      status: "PENDING",
    },
  });

  // Worker picks up PENDING export jobs via cron
  return success(job, 201);
}

// GET /api/exports — list export jobs
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const jobs = await prisma.exportJob.findMany({
    where: { providerId: user.provider.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return success(jobs);
}
