import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/notifications — list notification logs for the provider's appointments
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);
  if (!user.provider) return error("Provider profile required", 403);

  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const cursor = searchParams.get("cursor");

  const providerId = user.provider.id;

  try {
    // Build where clause — only notifications for this provider's appointments
    const where: Record<string, unknown> = {
      appointment: { providerId },
    };

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    if (status) {
      where.status = status;
    }

    const notifications = await prisma.notificationLog.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          select: {
            id: true,
            clientName: true,
            clientEmail: true,
            startTime: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return success({
      notifications: items,
      nextCursor,
    });
  } catch (e) {
    console.error("GET /api/notifications error:", e);
    return error("Failed to load notifications", 500);
  }
}
