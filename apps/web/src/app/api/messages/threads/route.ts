import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, withErrorHandler } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/messages/threads — list of provider's conversation threads
//
// Each thread carries the linked appointment + client + the latest message
// preview so the conversations list can render without an N+1 loop.
//
// Includes `myUserId` once at the top so the client can compute `isSelf`
// for message bubble alignment without an extra round-trip.
export const GET = withErrorHandler(async function GET(_request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: { select: { id: true } } },
  });
  if (!user?.provider) return error("Provider not found", 403);

  const threads = await prisma.thread.findMany({
    where: { providerId: user.provider.id },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          clientName: true,
          clientEmail: true,
          service: { select: { name: true } },
          client: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          isSystem: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Sort by latest message createdAt when present, fallback to thread.updatedAt.
  threads.sort((a, b) => {
    const aT = a.messages[0]?.createdAt ?? a.updatedAt;
    const bT = b.messages[0]?.createdAt ?? b.updatedAt;
    return new Date(bT).getTime() - new Date(aT).getTime();
  });

  return success({
    myUserId: user.id,
    threads: threads.map((t) => ({
      id: t.id,
      updatedAt: t.updatedAt,
      appointment: t.appointment,
      lastMessage: t.messages[0] ?? null,
    })),
  });
});
