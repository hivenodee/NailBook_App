import { Worker } from "../queue";
import { prisma, type MessageTemplateType, type NotificationChannel } from "@nailbook/db";
import { REMINDER_HOURS } from "@nailbook/shared";
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

// ─── Helper: format date for display ─────────────────────

function formatDateTime(date: Date, timezone = "America/New_York") {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

// ─── Helper: wrap text in styled HTML ─────────────────────

function wrapHtml(textBody: string): string {
  const escaped = textBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;">${escaped}</div>`;
}

// ─── Notification channel senders ────────────────────────

async function sendEmailNotification(
  to: string,
  title: string,
  body: string,
): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.log(`[reminder-email-dev] To: ${to} | Subject: ${title}`);
    console.log(`[reminder-email-dev] Body: ${body}`);
    return true; // treat dev fallback as success
  }
  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: title,
      html: wrapHtml(body),
      text: body,
    });
    return true;
  } catch (e) {
    console.error("[reminder-email] Failed:", e);
    return false;
  }
}

async function sendSmsNotification(
  to: string,
  body: string,
): Promise<boolean> {
  const client = getTwilio();
  if (!client || !process.env.TWILIO_FROM_NUMBER) {
    console.log(`[reminder-sms-dev] To: ${to} | Body: ${body}`);
    return true;
  }
  try {
    await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER,
      body,
    });
    return true;
  } catch (e) {
    console.error("[reminder-sms] Failed:", e);
    return false;
  }
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ success: boolean; ticketIds: string[] }> {
  const expo = getExpo();
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return { success: false, ticketIds: [] };

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default" as const,
    ...(data ? { data } : {}),
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      allTickets.push(...tickets);
    } catch (e) {
      console.error("[reminder-push] Failed to send chunk:", e);
    }
  }

  const ticketIds = allTickets
    .filter((t): t is { status: "ok"; id: string } => t.status === "ok")
    .map((t) => t.id);

  return { success: ticketIds.length > 0, ticketIds };
}

// ─── Main reminder worker ────────────────────────────────

export function startReminderWorker() {
  const worker = new Worker(
    "reminders",
    async (job) => {
      const { appointmentId, type } = job.data as {
        appointmentId: string;
        type: "24h" | "2h";
      };

      // Look up appointment + provider + client
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          provider: true,
          client: true,
        },
      });

      if (!appointment) return;
      if (appointment.status !== "CONFIRMED") return;

      const hoursUntil =
        type === "24h" ? REMINDER_HOURS.FIRST : REMINDER_HOURS.SECOND;
      const tz = appointment.provider.timezone || "America/New_York";
      const dateTimeStr = formatDateTime(appointment.startTime, tz);

      const email = appointment.clientEmail || appointment.client.email;
      const phone = appointment.clientPhone || appointment.client.phone;

      const title = `Reminder: ${appointment.service.name} in ${hoursUntil}h`;
      const body = `Appointment Reminder\n\n${appointment.service.name} with ${appointment.provider.businessName}\n${dateTimeStr}`;
      const smsBody = `Reminder: ${appointment.service.name} with ${appointment.provider.businessName} on ${dateTimeStr}`;

      // Look up ReminderSetting for this provider at the appropriate hoursBefore
      const reminderSetting = await prisma.reminderSetting.findFirst({
        where: {
          providerId: appointment.providerId,
          hoursBefore: hoursUntil,
          enabled: true,
        },
      });

      // Default channels if no setting exists
      let channels: NotificationChannel[];
      if (reminderSetting) {
        channels = reminderSetting.channels;
      } else {
        // Defaults: EMAIL for 24h, EMAIL+SMS for 2h
        channels =
          hoursUntil === REMINDER_HOURS.FIRST
            ? ["EMAIL" as NotificationChannel]
            : ["EMAIL" as NotificationChannel, "SMS" as NotificationChannel];
      }

      const templateType: MessageTemplateType = "REMINDER";

      // Send via each enabled channel and log every attempt
      for (const channel of channels) {
        const channelBody = channel === "SMS" ? smsBody : body;

        try {
          if (channel === "EMAIL" && email) {
            const ok = await sendEmailNotification(email, title, body);
            await prisma.notificationLog.create({
              data: {
                recipientId: appointment.clientId,
                appointmentId: appointment.id,
                templateType,
                channel,
                title,
                body: channelBody,
                status: ok ? "SENT" : "FAILED",
                ...(ok ? { sentAt: new Date() } : { failedAt: new Date() }),
              },
            });
          } else if (channel === "SMS" && phone) {
            const ok = await sendSmsNotification(phone, smsBody);
            await prisma.notificationLog.create({
              data: {
                recipientId: appointment.clientId,
                appointmentId: appointment.id,
                templateType,
                channel,
                title,
                body: channelBody,
                status: ok ? "SENT" : "FAILED",
                ...(ok ? { sentAt: new Date() } : { failedAt: new Date() }),
              },
            });
          } else if (channel === "PUSH") {
            // Look up active push tokens for the client
            const pushTokens = await prisma.pushToken.findMany({
              where: { userId: appointment.clientId, active: true },
              select: { token: true },
            });

            if (pushTokens.length > 0) {
              const result = await sendPushNotifications(
                pushTokens.map((t) => t.token),
                title,
                body,
                { appointmentId, type: "reminder" }
              );
              await prisma.notificationLog.create({
                data: {
                  recipientId: appointment.clientId,
                  appointmentId: appointment.id,
                  templateType,
                  channel,
                  title,
                  body: channelBody,
                  status: result.success ? "SENT" : "FAILED",
                  ...(result.success ? { sentAt: new Date() } : { failedAt: new Date() }),
                  metadata: { ticketIds: result.ticketIds },
                },
              });
            } else {
              // No push tokens — skip with SKIPPED status
              await prisma.notificationLog.create({
                data: {
                  recipientId: appointment.clientId,
                  appointmentId: appointment.id,
                  templateType,
                  channel,
                  title,
                  body: channelBody,
                  status: "SKIPPED",
                  metadata: { reason: "No active push tokens" },
                },
              });
            }
          } else {
            // Channel not applicable (e.g., no email/phone)
            await prisma.notificationLog.create({
              data: {
                recipientId: appointment.clientId,
                appointmentId: appointment.id,
                templateType,
                channel,
                title,
                body: channelBody,
                status: "SKIPPED",
                metadata: { reason: `No ${channel.toLowerCase()} contact info` },
              },
            });
          }
        } catch (err) {
          console.error(`[reminder] ${channel} failed for ${appointmentId}:`, err);
          await prisma.notificationLog.create({
            data: {
              recipientId: appointment.clientId,
              appointmentId: appointment.id,
              templateType,
              channel,
              title,
              body: channelBody,
              status: "FAILED",
              failedAt: new Date(),
              metadata: { error: err instanceof Error ? err.message : "Unknown error" },
            },
          });
        }
      }

      console.log(
        `Processed ${type} reminder for appointment ${appointmentId} (channels: ${channels.join(", ")})`
      );
    },
    {
      connection: {
        host: new URL(process.env.REDIS_URL!).hostname,
        port: Number(new URL(process.env.REDIS_URL!).port) || 6379,
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err.message);
  });

  return worker;
}
