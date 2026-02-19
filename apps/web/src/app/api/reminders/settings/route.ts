import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { updateReminderSettingsSchema } from "@nailbook/shared";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = [
  { hoursBefore: 24, channels: ["EMAIL" as const], enabled: true },
  { hoursBefore: 2, channels: ["EMAIL" as const, "SMS" as const], enabled: true },
];

// GET /api/reminders/settings — get reminder settings for the provider
export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { provider: true },
    });
    if (!user) return error("User not found", 404);
    if (!user.provider) return error("Provider profile required", 403);

    const settings = await prisma.reminderSetting.findMany({
      where: { providerId: user.provider.id },
      orderBy: { hoursBefore: "desc" },
    });

    if (settings.length === 0) {
      return success({ settings: DEFAULT_SETTINGS });
    }

    return success({
      settings: settings.map((s) => ({
        id: s.id,
        hoursBefore: s.hoursBefore,
        channels: s.channels,
        enabled: s.enabled,
      })),
    });
  } catch (e) {
    console.error("GET /api/reminders/settings error:", e);
    return error("Failed to load settings", 500);
  }
}

// PUT /api/reminders/settings — update reminder settings for the provider
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);
  if (!user.provider) return error("Provider profile required", 403);

  const result = await parseBody(request, updateReminderSettingsSchema);
  if (result.error) return result.error;

  const { settings: newSettings } = result.data;
  const providerId = user.provider.id;

  try {
    // Transaction: delete all existing + create new
    const created = await prisma.$transaction(async (tx) => {
      await tx.reminderSetting.deleteMany({ where: { providerId } });

      const records = await Promise.all(
        newSettings.map((s) =>
          tx.reminderSetting.create({
            data: {
              providerId,
              hoursBefore: s.hoursBefore,
              channels: s.channels as any,
              enabled: s.enabled,
            },
          })
        )
      );

      return records;
    });

    return success({
      settings: created.map((s) => ({
        id: s.id,
        hoursBefore: s.hoursBefore,
        channels: s.channels,
        enabled: s.enabled,
      })),
    });
  } catch (e) {
    console.error("Failed to save reminder settings:", e);
    return error("Failed to save settings", 500);
  }
}
