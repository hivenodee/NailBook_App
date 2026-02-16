import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { DEFAULT_TEMPLATES, VARIABLES_BY_TYPE } from "@/lib/templates";
import type { MessageTemplateType } from "@nailbook/db";

export const dynamic = "force-dynamic";

const ALL_TYPES: MessageTemplateType[] = [
  "BOOKING_CONFIRMATION",
  "BOOKING_NOTIFICATION",
  "CANCELLATION",
  "COMPLETION",
  "REMINDER",
  "FOLLOWUP",
  "WAITLIST_AVAILABLE",
  "WAITLIST_JOINED",
];

async function getProviderForUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { provider: true },
  });
  return user?.provider ?? null;
}

// GET /api/message-templates — list all templates for current provider
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const provider = await getProviderForUser(userId);
  if (!provider) return error("Provider not found", 404);

  const customs = await prisma.messageTemplate.findMany({
    where: { providerId: provider.id },
  });

  const customMap = new Map(customs.map((c) => [c.type, c]));

  const templates = ALL_TYPES.map((type) => {
    const custom = customMap.get(type);
    const defaults = DEFAULT_TEMPLATES[type];
    return {
      type,
      emailSubject: custom?.emailSubject ?? null,
      emailBody: custom?.emailBody ?? null,
      smsBody: custom?.smsBody ?? null,
      isActive: custom?.isActive ?? true,
      defaults,
      variables: VARIABLES_BY_TYPE[type],
    };
  });

  return success(templates);
}

// PUT /api/message-templates — bulk upsert templates
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const provider = await getProviderForUser(userId);
  if (!provider) return error("Provider not found", 404);

  const body = await request.json();
  const { templates } = body as {
    templates: {
      type: MessageTemplateType;
      emailSubject?: string | null;
      emailBody?: string | null;
      smsBody?: string | null;
    }[];
  };

  if (!Array.isArray(templates)) {
    return error("templates must be an array", 400);
  }

  for (const tpl of templates) {
    if (!ALL_TYPES.includes(tpl.type)) {
      return error(`Invalid template type: ${tpl.type}`, 400);
    }
  }

  const results = await prisma.$transaction(
    templates.map((tpl) =>
      prisma.messageTemplate.upsert({
        where: {
          providerId_type: { providerId: provider.id, type: tpl.type },
        },
        update: {
          emailSubject: tpl.emailSubject ?? null,
          emailBody: tpl.emailBody ?? null,
          smsBody: tpl.smsBody ?? null,
        },
        create: {
          providerId: provider.id,
          type: tpl.type,
          emailSubject: tpl.emailSubject ?? null,
          emailBody: tpl.emailBody ?? null,
          smsBody: tpl.smsBody ?? null,
        },
      })
    )
  );

  return success(results);
}
