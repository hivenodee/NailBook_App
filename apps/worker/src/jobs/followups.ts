import { Worker } from "../queue";
import { prisma } from "@nailbook/db";
import postmark from "postmark";

const emailClient = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN!
);

export function startFollowupWorker() {
  const worker = new Worker(
    "followups",
    async (job) => {
      const { appointmentId } = job.data as { appointmentId: string };

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          provider: true,
          client: true,
        },
      });

      if (!appointment) return;
      if (appointment.status !== "COMPLETED") return;

      const email = appointment.clientEmail || appointment.client.email;
      if (!email) return;

      await emailClient.sendEmail({
        From: "bookings@nailbook.com",
        To: email,
        Subject: `How was your appointment with ${appointment.provider.businessName}?`,
        HtmlBody: `
          <h2>Thanks for visiting!</h2>
          <p>How was your <strong>${appointment.service.name}</strong> with ${appointment.provider.businessName}?</p>
          <p>Leave a review to help others find great nail techs.</p>
        `,
      });

      console.log(`Sent follow-up for appointment ${appointmentId}`);
    },
    {
      connection: {
        host: new URL(process.env.REDIS_URL!).hostname,
        port: Number(new URL(process.env.REDIS_URL!).port) || 6379,
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Follow-up job ${job?.id} failed:`, err.message);
  });

  return worker;
}
