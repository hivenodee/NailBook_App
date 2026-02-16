import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { approveWaitlistEntry } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

// POST /api/waitlist/entries/:id/approve — provider approves, client gets notified
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
  if (!entry) return error("Entry not found", 404);
  if (entry.providerId !== user.provider.id) return error("Not authorized", 403);
  if (entry.status !== "AVAILABLE") return error("Entry is not in AVAILABLE status", 400);

  await approveWaitlistEntry(id);

  return success({ approved: true });
}
