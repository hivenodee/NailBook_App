import { Worker } from "../queue";
import { prisma } from "@nailbook/db";
import { REMINDER_HOURS } from "@nailbook/shared";
import postmark from "postmark";

const emailClient = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN!
);

export function startReminderWorker() {
  const worker = new Worker(
    "reminders",
    async (job) => {
      const { appointmentId, type } = job.data as {
        appointmentId: string;
        type: "24h" | "2h";
      };

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

      const email = appointment.clientEmail || appointment.client.email;
      if (!email) return;

      const hoursUntil =
        type === "24h" ? REMINDER_HOURS.FIRST : REMINDER_HOURS.SECOND;

      await emailClient.sendEmail({
        From: "reminders@nailbook.com",
        To: email,
        Subject: `Reminder: ${appointment.service.name} in ${hoursUntil}h`,
        HtmlBody: `
          <h2>Appointment Reminder</h2>
          <p><strong>${appointment.service.name}</strong> with ${appointment.provider.businessName}</p>
          <p>${appointment.startTime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}</p>
        `,
      });

      console.log(
        `Sent ${type} reminder for appointment ${appointmentId}`
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
