import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { getUploadUrl, getPublicUrl } from "@/lib/storage";
import { MEDIA_LIMITS } from "@nailbook/shared";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/providers/me/cover — get presigned upload URL for cover image
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const body = await request.json();
  const { contentType, fileSize } = body as { contentType: string; fileSize?: number };

  if (!MEDIA_LIMITS.ALLOWED_IMAGE_TYPES.includes(contentType as typeof MEDIA_LIMITS.ALLOWED_IMAGE_TYPES[number])) {
    return error("Only JPEG, PNG, and WebP images are allowed");
  }

  const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
  if (fileSize && fileSize > MAX_COVER_SIZE) {
    return error("Cover image must be under 10MB");
  }

  const ext = contentType.split("/")[1];
  const key = `covers/${user.provider.id}/${randomUUID()}.${ext}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  await prisma.provider.update({
    where: { id: user.provider.id },
    data: { coverImageUrl: publicUrl },
  });

  return success({ uploadUrl, coverImageUrl: publicUrl }, 201);
}
