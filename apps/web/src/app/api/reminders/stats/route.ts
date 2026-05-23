import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/reminders/stats — aggregate NotificationLog rows for this
// provider's reminder + follow-up sends, grouped by status, for the current month.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: { select: { id: true } } },
  });
  if (!user?.provider) return error("Provider profile required", 403);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Group NotificationLog rows tied to this provider's appointments,
  // limited to reminder-style template types, since the start of the month.
  const grouped = await prisma.notificationLog.groupBy({
    by: ["status"],
    where: {
      appointment: { providerId: user.provider.id },
      templateType: { in: ["REMINDER", "FOLLOWUP"] },
      createdAt: { gte: monthStart },
    },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  for (const row of grouped) byStatus[row.status] = row._count._all;

  const sent = (byStatus.SENT ?? 0) + (byStatus.DELIVERED ?? 0) + (byStatus.FAILED ?? 0);
  const delivered = byStatus.DELIVERED ?? 0;
  const failed = byStatus.FAILED ?? 0;

  return success({
    monthStart: monthStart.toISOString(),
    sent,
    delivered,
    failed,
  });
}
