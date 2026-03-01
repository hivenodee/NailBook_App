import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody, withErrorHandler } from "@/lib/api-utils";
import { sendMessageSchema } from "@nailbook/shared";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// GET /api/messages?threadId=xxx
export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return error("threadId is required");

  const messages = await prisma.message.findMany({
    where: { threadId },
    include: {
      sender: { select: { firstName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return success(messages);
});

// POST /api/messages — send a message
export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, sendMessageSchema);
  if (result.error) return result.error;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return error("User not found", 404);

  const thread = await prisma.thread.findUnique({
    where: { id: result.data.threadId },
  });
  if (!thread) return error("Thread not found", 404);

  // Sanitize free-text input to prevent XSS
  const sanitizedBody = sanitizeText(result.data.body);

  const message = await prisma.message.create({
    data: {
      threadId: result.data.threadId,
      senderId: user.id,
      body: sanitizedBody,
    },
  });

  return success(message, 201);
});
