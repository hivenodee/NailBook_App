import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { timeOffSchema } from "@nailbook/shared";
import { invalidateAvailabilityRange } from "@/lib/cache";

export const dynamic = "force-dynamic";

// GET /api/availability/time-off — get future time-off for current provider
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      providerId: user.provider.id,
      endDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
  });

  return success(timeOffs);
}

// POST /api/availability/time-off — create a new time-off block
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, timeOffSchema);
  if (result.error) return result.error;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const startDate = new Date(result.data.startDate);
  const endDate = new Date(result.data.endDate);

  if (endDate <= startDate) {
    return error("End date must be after start date", 422);
  }

  const timeOff = await prisma.timeOff.create({
    data: {
      providerId: user.provider.id,
      startDate,
      endDate,
      reason: result.data.reason || null,
    },
  });

  // Invalidate cached availability for the time-off date range
  await invalidateAvailabilityRange(user.provider.id, startDate, endDate);

  return success(timeOff, 201);
}
