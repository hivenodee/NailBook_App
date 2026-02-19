import { Worker } from "../queue";
import { prisma } from "@nailbook/db";
import { Resend } from "resend";
import twilio from "twilio";
import Expo, { type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";

// ─── Lazy-init service clients ───────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

let _twilio: twilio.Twilio | null = null;
function getTwilio(): twilio.Twilio | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  if (!_twilio) _twilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return _twilio;
}

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

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

// ─── Helper: wrap text in styled HTML ─────────────────────

function wrapHtml(textBody: string): string {
  const escaped = textBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;">${escaped}</div>`;
}

// ─── Notification retry worker ───────────────────────────

export function startNotificationRetryWorker() {
  const worker = new Worker(
    "notification-retry",
    async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find failed notifications with retryCount < 3 in the last 24h
      const failedLogs = await prisma.notificationLog.findMany({
        where: {
          status: "FAILED",
          retryCount: { lt: 3 },
          createdAt: { gt: twentyFourHoursAgo },
        },
        include: {
          appointment: {
            include: {
              client: { select: { id: true, email: true, phone: true } },
            },
          },
        },
      });

      if (failedLogs.length === 0) return;

      let retried = 0;

      for (const log of failedLogs) {
        try {
          let success = false;

          // Skip if appointment was deleted/null
          if (!log.appointment) {
            await prisma.notificationLog.update({
              where: { id: log.id },
              data: { retryCount: { increment: 1 } },
            });
            continue;
          }

          if (log.channel === "EMAIL") {
            const email = log.appointment.clientEmail || log.appointment.client.email;
            if (email) {
              const client = getResend();
              if (client) {
                await client.emails.send({
                  from: FROM_EMAIL,
                  to: email,
                  subject: log.title || "Notification",
                  html: wrapHtml(log.body),
                  text: log.body,
                });
                success = true;
              }
            }
          } else if (log.channel === "SMS") {
            const phone = log.appointment.clientPhone || log.appointment.client.phone;
            if (phone) {
              const client = getTwilio();
              if (client && process.env.TWILIO_FROM_NUMBER) {
                await client.messages.create({
                  to: phone,
                  from: process.env.TWILIO_FROM_NUMBER,
                  body: log.body,
                });
                success = true;
              }
            }
          } else if (log.channel === "PUSH") {
            // Look up active push tokens for the recipient
            const pushTokens = await prisma.pushToken.findMany({
              where: { userId: log.recipientId, active: true },
              select: { token: true },
            });

            const validTokens = pushTokens
              .map((t) => t.token)
              .filter((t) => Expo.isExpoPushToken(t));

            if (validTokens.length > 0) {
              const expo = getExpo();
              const messages: ExpoPushMessage[] = validTokens.map((token) => ({
                to: token,
                title: log.title ?? undefined,
                body: log.body,
                sound: "default" as const,
              }));

              const chunks = expo.chunkPushNotifications(messages);
              const allTickets: ExpoPushTicket[] = [];

              for (const chunk of chunks) {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                allTickets.push(...tickets);
              }

              const ticketIds = allTickets
                .filter((t): t is { status: "ok"; id: string } => t.status === "ok")
                .map((t) => t.id);

              success = ticketIds.length > 0;

              if (success) {
                await prisma.notificationLog.update({
                  where: { id: log.id },
                  data: {
                    status: "SENT",
                    sentAt: new Date(),
                    retryCount: { increment: 1 },
                    metadata: { ticketIds },
                  },
                });
                retried++;
                continue;
              }
            }
          }

          // Update the log
          await prisma.notificationLog.update({
            where: { id: log.id },
            data: {
              status: success ? "SENT" : "FAILED",
              ...(success ? { sentAt: new Date() } : { failedAt: new Date() }),
              retryCount: { increment: 1 },
            },
          });

          if (success) retried++;
        } catch (err) {
          console.error(`[notification-retry] Failed to retry ${log.id}:`, err);
          const existingMeta = (log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata))
            ? log.metadata as Record<string, string | number | boolean | null>
            : {};
          await prisma.notificationLog.update({
            where: { id: log.id },
            data: {
              retryCount: { increment: 1 },
              failedAt: new Date(),
              metadata: {
                ...existingMeta,
                lastRetryError: err instanceof Error ? err.message : "Unknown error",
              },
            },
          });
        }
      }

      if (retried > 0 || failedLogs.length > 0) {
        console.log(
          `[notification-retry] Retried ${retried}/${failedLogs.length} failed notifications`
        );
      }
    },
    {
      connection: {
        host: new URL(process.env.REDIS_URL!).hostname,
        port: Number(new URL(process.env.REDIS_URL!).port) || 6379,
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Notification retry job ${job?.id} failed:`, err.message);
  });

  return worker;
}
