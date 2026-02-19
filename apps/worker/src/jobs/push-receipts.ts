import { Worker } from "../queue";
import { prisma } from "@nailbook/db";
import Expo, { type ExpoPushReceipt } from "expo-server-sdk";

// ─── Lazy-init Expo client ───────────────────────────────

let _expo: Expo | null = null;
function getExpo(): Expo {
  if (!_expo) {
    _expo = new Expo({
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
        : {}),
    });
  }
  return _expo;
}

// ─── Push receipt checker worker ─────────────────────────

export function startPushReceiptWorker() {
  const worker = new Worker(
    "push-receipts",
    async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find PUSH notifications that were SENT in the last 24h
      const pendingLogs = await prisma.notificationLog.findMany({
        where: {
          channel: "PUSH",
          status: "SENT",
          sentAt: { gt: twentyFourHoursAgo },
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (pendingLogs.length === 0) return;

      // Extract ticket IDs from metadata
      const receiptIdToLogId = new Map<string, string>();
      const allReceiptIds: string[] = [];

      for (const log of pendingLogs) {
        const meta = log.metadata as Record<string, unknown> | null;
        const ticketIds = (meta?.ticketIds as string[]) || [];
        for (const ticketId of ticketIds) {
          receiptIdToLogId.set(ticketId, log.id);
          allReceiptIds.push(ticketId);
        }
      }

      if (allReceiptIds.length === 0) return;

      // Batch-check receipts via Expo Push API
      const expo = getExpo();
      const chunks = expo.chunkPushNotificationReceiptIds(allReceiptIds);

      for (const chunk of chunks) {
        try {
          const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

          for (const [receiptId, receipt] of Object.entries(receipts)) {
            const logId = receiptIdToLogId.get(receiptId);
            if (!logId) continue;

            if (receipt.status === "ok") {
              await prisma.notificationLog.update({
                where: { id: logId },
                data: {
                  status: "DELIVERED",
                  deliveredAt: new Date(),
                },
              });
            } else {
              // receipt.status === 'error'
              const errorReceipt = receipt as ExpoPushReceipt & {
                message?: string;
                details?: { error?: string };
              };
              await prisma.notificationLog.update({
                where: { id: logId },
                data: {
                  status: "FAILED",
                  failedAt: new Date(),
                  metadata: {
                    error: errorReceipt.message || "Push delivery failed",
                    errorCode: errorReceipt.details?.error,
                  },
                },
              });

              // If device is not registered, deactivate the push token
              if (errorReceipt.details?.error === "DeviceNotRegistered") {
                const meta = (
                  await prisma.notificationLog.findUnique({
                    where: { id: logId },
                    select: { metadata: true },
                  })
                )?.metadata as Record<string, unknown> | null;
                const expoPushToken = (errorReceipt as { details?: { expoPushToken?: string } })
                  .details?.expoPushToken;
                if (expoPushToken) {
                  await prisma.pushToken.updateMany({
                    where: { token: expoPushToken },
                    data: { active: false },
                  });
                  console.log(`[push-receipts] Deactivated unregistered token: ${expoPushToken}`);
                }
              }
            }
          }
        } catch (e) {
          console.error("[push-receipts] Failed to check receipt chunk:", e);
        }
      }

      console.log(`[push-receipts] Checked ${allReceiptIds.length} receipts from ${pendingLogs.length} logs`);
    },
    {
      connection: {
        host: new URL(process.env.REDIS_URL!).hostname,
        port: Number(new URL(process.env.REDIS_URL!).port) || 6379,
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Push receipt job ${job?.id} failed:`, err.message);
  });

  return worker;
}
