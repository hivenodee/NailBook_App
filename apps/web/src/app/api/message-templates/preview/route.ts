import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { success, error } from "@/lib/api-utils";
import { renderTemplate, SAMPLE_VARS } from "@/lib/templates";
import type { MessageTemplateType } from "@nailbook/db";

export const dynamic = "force-dynamic";

// POST /api/message-templates/preview — render a template with sample data
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const body = await request.json();
  const { type, emailSubject, emailBody, smsBody } = body as {
    type: MessageTemplateType;
    emailSubject: string;
    emailBody: string;
    smsBody: string;
  };

  if (!type || !emailSubject || !emailBody || !smsBody) {
    return error("type, emailSubject, emailBody, and smsBody are required", 400);
  }

  const rendered = {
    emailSubject: renderTemplate(emailSubject, SAMPLE_VARS),
    emailBody: renderTemplate(emailBody, SAMPLE_VARS),
    smsBody: renderTemplate(smsBody, SAMPLE_VARS),
  };

  return success(rendered);
}
