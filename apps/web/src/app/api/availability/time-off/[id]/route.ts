import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { invalidateAvailabilityRange } from "@/lib/cache";
import { notifyWaitlistForDate } from "@/lib/waitlist";

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

  // Notify waitlist for each date in the deleted time-off range
  const start = new Date(timeOff.startDate);
  const end = new Date(timeOff.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    notifyWaitlistForDate(user.provider.id, dateStr).catch((e) =>
      console.error("[waitlist] Failed to notify:", e),
    );
  }

  return success({ deleted: true });
}
