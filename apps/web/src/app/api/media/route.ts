import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { getUploadUrl, getPublicUrl } from "@/lib/storage";
import { MEDIA_LIMITS } from "@nailbook/shared";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/media?providerId=xxx — portfolio media
export async function GET(request: NextRequest) {
  const providerId = new URL(request.url).searchParams.get("providerId");
  if (!providerId) return error("providerId is required");

  const media = await prisma.mediaAsset.findMany({
    where: { providerId },
    orderBy: { sortOrder: "asc" },
  });

  return success(media);
}

// POST /api/media — request presigned upload URL
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const body = await request.json();
  const { contentType, type } = body as {
    contentType: string;
    type: "PHOTO" | "VIDEO";
  };

  // Validate content type
  const allowedTypes: string[] = [
    ...MEDIA_LIMITS.ALLOWED_IMAGE_TYPES,
    ...MEDIA_LIMITS.ALLOWED_VIDEO_TYPES,
  ];
  if (!allowedTypes.includes(contentType)) {
    return error(`Unsupported file type. Allowed: ${allowedTypes.join(", ")}`);
  }

  // Check portfolio limit
  const count = await prisma.mediaAsset.count({
    where: { providerId: user.provider.id },
  });
  if (count >= MEDIA_LIMITS.MAX_PORTFOLIO_ITEMS) {
    return error(`Portfolio limit of ${MEDIA_LIMITS.MAX_PORTFOLIO_ITEMS} reached`);
  }

  const ext = contentType.split("/")[1];
  const key = `portfolio/${user.provider.id}/${randomUUID()}.${ext}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  // Create media record
  const media = await prisma.mediaAsset.create({
    data: {
      providerId: user.provider.id,
      type,
      url: publicUrl,
      mimeType: contentType,
      sizeBytes: 0, // updated after upload
      sortOrder: count,
    },
  });

  return success({ uploadUrl, media }, 201);
}
