import { Worker } from "../queue";
import { prisma } from "@nailbook/db";

export function startCleanupWorker() {
  const worker = new Worker(
    "cleanup",
    async () => {
      // Mark expired drafts — never delete per architecture.md
      const expireBefore = new Date(Date.now() - 30 * 60 * 1000); // 30 min

      const expired = await prisma.appointment.updateMany({
        where: {
          status: "DRAFT",
          createdAt: { lt: expireBefore },
        },
        data: {
          status: "CANCELLED",
        },
      });

      if (expired.count > 0) {
        console.log(`Marked ${expired.count} expired drafts as cancelled`);
      }

      // Mark expired PENDING_PAYMENT appointments
      const paymentExpireBefore = new Date(Date.now() - 60 * 60 * 1000); // 1 hour

      const expiredPayments = await prisma.appointment.updateMany({
        where: {
          status: "PENDING_PAYMENT",
          createdAt: { lt: paymentExpireBefore },
        },
        data: {
          status: "CANCELLED",
        },
      });

      if (expiredPayments.count > 0) {
        console.log(
          `Marked ${expiredPayments.count} expired pending payments as cancelled`
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
    console.error(`Cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
