import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/feedback/:id — Toggle isPublic (auth required, provider only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json();
  const { isPublic } = body as { isPublic: boolean };

  if (typeof isPublic !== "boolean") {
    return error("isPublic must be a boolean", 422);
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: { select: { id: true } } },
  });
  if (!user?.provider) return error("Provider not found", 403);

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) return error("Feedback not found", 404);
  if (feedback.providerId !== user.provider.id) return error("Forbidden", 403);

  const updated = await prisma.feedback.update({
    where: { id },
    data: { isPublic },
  });

  return success(updated);
}
