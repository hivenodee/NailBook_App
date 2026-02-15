import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { availabilityRuleSchema } from "@nailbook/shared";
import { invalidateAllAvailability } from "@/lib/cache";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bulkRulesSchema = z.array(availabilityRuleSchema).min(1).max(7);

// GET /api/availability/rules — get all rules for the current provider
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const rules = await prisma.availabilityRule.findMany({
    where: { providerId: user.provider.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return success(rules);
}

// POST /api/availability/rules — bulk upsert weekly hours
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const result = await parseBody(request, bulkRulesSchema);
  if (result.error) return result.error;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const providerId = user.provider.id;

  // Validate: no duplicate dayOfWeek entries
  const days = result.data.map((r) => r.dayOfWeek);
  if (new Set(days).size !== days.length) {
    return error("Duplicate dayOfWeek entries", 422);
  }

  // Validate: startTime < endTime for active rules
  for (const rule of result.data) {
    if (rule.isActive && rule.startTime >= rule.endTime) {
      return error(`Day ${rule.dayOfWeek}: start time must be before end time`, 422);
    }
  }

  // Transaction: delete existing rules, create new ones
  await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({ where: { providerId } });
    await tx.availabilityRule.createMany({
      data: result.data.map((rule) => ({
        providerId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isActive: rule.isActive,
      })),
    });
  });

  // Schedule changed — invalidate all cached availability for this provider
  await invalidateAllAvailability(providerId);

  const rules = await prisma.availabilityRule.findMany({
    where: { providerId },
    orderBy: { dayOfWeek: "asc" },
  });

  return success(rules);
}
