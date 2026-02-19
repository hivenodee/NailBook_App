import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { registerPushTokenSchema } from "@nailbook/shared";
import { z } from "zod";

export const dynamic = "force-dynamic";

// POST /api/push-tokens — register a push token for the authenticated user
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return error("User not found", 404);

  const result = await parseBody(request, registerPushTokenSchema);
  if (result.error) return result.error;

  const { token, platform } = result.data;

  // Check if this token already exists
  const existing = await prisma.pushToken.findUnique({ where: { token } });

  if (existing) {
    if (existing.userId === user.id) {
      // Same user — reactivate if inactive
      const updated = await prisma.pushToken.update({
        where: { token },
        data: { active: true },
      });
      return success(
        { id: updated.id, token: updated.token, platform: updated.platform, active: updated.active },
        201
      );
    } else {
      // Different user — device changed hands, reassign
      const updated = await prisma.pushToken.update({
        where: { token },
        data: { userId: user.id, active: true },
      });
      return success(
        { id: updated.id, token: updated.token, platform: updated.platform, active: updated.active },
        201
      );
    }
  }

  // New token
  const pushToken = await prisma.pushToken.create({
    data: {
      userId: user.id,
      token,
      platform,
      active: true,
    },
  });

  return success(
    { id: pushToken.id, token: pushToken.token, platform: pushToken.platform, active: pushToken.active },
    201
  );
}

// DELETE /api/push-tokens — deactivate a push token
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return error("User not found", 404);

  const deleteSchema = z.object({ token: z.string().min(1) });
  const result = await parseBody(request, deleteSchema);
  if (result.error) return result.error;

  const { token } = result.data;

  // Deactivate the token for this user
  await prisma.pushToken.updateMany({
    where: { token, userId: user.id },
    data: { active: false },
  });

  return success({ success: true });
}
