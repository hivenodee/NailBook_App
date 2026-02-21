import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createIntakeQuestionSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/services/:id/intake — list intake questions (public, no auth)
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const questions = await prisma.intakeQuestion.findMany({
    where: { serviceId: id },
    orderBy: { sortOrder: "asc" },
  });

  return success(questions);
}

// POST /api/services/:id/intake — create intake question (provider auth)
export async function POST(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;

  // Verify ownership
  const service = await prisma.service.findUnique({
    where: { id },
    include: { provider: { include: { user: { select: { clerkId: true } } } } },
  });
  if (!service) return error("Service not found", 404);
  if (service.provider.user.clerkId !== userId) return error("Forbidden", 403);

  const result = await parseBody(request, createIntakeQuestionSchema);
  if (result.error) return result.error;

  const { label, type, options, isRequired, sortOrder } = result.data;

  // Validate that SELECT and CHECKBOX have options
  if ((type === "SELECT" || type === "CHECKBOX") && (!options || options.length === 0)) {
    return error("Options are required for dropdown and checkbox questions", 400);
  }

  const question = await prisma.intakeQuestion.create({
    data: {
      serviceId: id,
      label,
      type,
      options: options || undefined,
      isRequired,
      sortOrder,
    },
  });

  return success(question, 201);
}
