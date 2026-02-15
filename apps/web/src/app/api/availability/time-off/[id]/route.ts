import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { invalidateAvailabilityRange } from "@/lib/cache";

export const dynamic = "force-dynamic";

// DELETE /api/availability/time-off/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const timeOff = await prisma.timeOff.findUnique({ where: { id } });
  if (!timeOff) return error("Time off not found", 404);
  if (timeOff.providerId !== user.provider.id) return error("Not authorized", 403);

  await prisma.timeOff.delete({ where: { id } });

  // Invalidate cached availability for the time-off date range
  await invalidateAvailabilityRange(user.provider.id, timeOff.startDate, timeOff.endDate);

  return success({ deleted: true });
}
