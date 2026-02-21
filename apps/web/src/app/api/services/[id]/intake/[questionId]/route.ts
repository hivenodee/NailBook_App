import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; questionId: string }> };

// PATCH /api/services/:id/intake/:questionId — update question
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id, questionId } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: { provider: { include: { user: { select: { clerkId: true } } } } },
  });
  if (!service) return error("Service not found", 404);
  if (service.provider.user.clerkId !== userId) return error("Forbidden", 403);

  const question = await prisma.intakeQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question || question.serviceId !== id) return error("Question not found", 404);

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if ("label" in body) data.label = body.label;
  if ("type" in body) data.type = body.type;
  if ("options" in body) data.options = body.options;
  if ("isRequired" in body) data.isRequired = body.isRequired;
  if ("sortOrder" in body) data.sortOrder = body.sortOrder;

  const updated = await prisma.intakeQuestion.update({
    where: { id: questionId },
    data,
  });

  return success(updated);
}

// DELETE /api/services/:id/intake/:questionId — delete question
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id, questionId } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: { provider: { include: { user: { select: { clerkId: true } } } } },
  });
  if (!service) return error("Service not found", 404);
  if (service.provider.user.clerkId !== userId) return error("Forbidden", 403);

  const question = await prisma.intakeQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question || question.serviceId !== id) return error("Question not found", 404);

  await prisma.intakeQuestion.delete({ where: { id: questionId } });

  return success({ deleted: true });
}
