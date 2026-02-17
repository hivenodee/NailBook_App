import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { submitFeedbackSchema } from "@nailbook/shared";
import { strictRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/feedback — Submit anonymous feedback (no auth required)
export async function POST(request: NextRequest) {
  const limited = await strictRateLimit(request);
  if (limited) return limited;

  const parsed = await parseBody(request, submitFeedbackSchema);
  if (parsed.error) return parsed.error;

  const { appointmentId, rating, body } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true, providerId: true },
  });

  if (!appointment) return error("Appointment not found", 404);
  if (appointment.status !== "COMPLETED") {
    return error("Feedback can only be left for completed appointments", 400);
  }

  const existing = await prisma.feedback.findUnique({
    where: { appointmentId },
  });
  if (existing) return error("Feedback already submitted for this appointment", 409);

  const feedback = await prisma.feedback.create({
    data: {
      appointmentId,
      providerId: appointment.providerId,
      rating,
      body,
    },
  });

  return success(feedback, 201);
}

// GET /api/feedback — Provider's feedback list (auth required)
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: { select: { id: true } } },
  });
  if (!user?.provider) return error("Provider not found", 403);

  const url = new URL(request.url);
  const publicFilter = url.searchParams.get("public");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { providerId: user.provider.id };
  if (publicFilter === "true") where.isPublic = true;
  if (publicFilter === "false") where.isPublic = false;

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        appointment: {
          select: {
            startTime: true,
            service: { select: { name: true } },
          },
        },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return success({ items, total, page, limit });
}
