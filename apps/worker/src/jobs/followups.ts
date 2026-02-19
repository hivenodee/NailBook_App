import { Worker } from "../queue";
import { prisma } from "@nailbook/db";
import { Resend } from "resend";

// ─── Lazy-init Resend client ─────────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

function wrapHtml(textBody: string): string {
  const escaped = textBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;">${escaped}</div>`;
}

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

      const subject = `How was your appointment with ${appointment.provider.businessName}?`;
      const textBody = `Thanks for visiting!\n\nHow was your ${appointment.service.name} with ${appointment.provider.businessName}?\n\nLeave a review to help others find great nail techs.`;

      const client = getResend();
      if (!client) {
        console.log(`[followup-dev] To: ${email}`);
        console.log(`[followup-dev] Subject: ${subject}`);
        console.log(`[followup-dev] Body: ${textBody}`);
        return;
      }

      await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html: wrapHtml(textBody),
        text: textBody,
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
