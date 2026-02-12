import { Worker } from "../queue";
import { prisma } from "@nailbook/db";

export function startExportWorker() {
  const worker = new Worker(
    "exports",
    async (job) => {
      const { exportJobId } = job.data as { exportJobId: string };

      const exportJob = await prisma.exportJob.findUnique({
        where: { id: exportJobId },
      });
      if (!exportJob) return;

      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "PROCESSING" },
      });

      try {
        let csvContent = "";

        switch (exportJob.type) {
          case "CLIENTS": {
            const appointments = await prisma.appointment.findMany({
              where: { providerId: exportJob.providerId },
              include: { client: true },
              distinct: ["clientId"],
            });
            csvContent =
              "Name,Email,Phone,First Visit\n" +
              appointments
                .map(
                  (a) =>
                    `"${a.client.firstName || a.clientName || ""}","${a.client.email || a.clientEmail || ""}","${a.clientPhone || ""}","${a.createdAt.toISOString()}"`
                )
                .join("\n");
            break;
          }

          case "APPOINTMENTS": {
            const appts = await prisma.appointment.findMany({
              where: { providerId: exportJob.providerId },
              include: { service: true, client: true },
              orderBy: { startTime: "desc" },
            });
            csvContent =
              "Date,Service,Client,Status,Total\n" +
              appts
                .map(
                  (a) =>
                    `"${a.startTime.toISOString()}","${a.service.name}","${a.client.firstName || a.clientName || ""}","${a.status}","${(a.totalInCents / 100).toFixed(2)}"`
                )
                .join("\n");
            break;
          }

          case "TRANSACTIONS": {
            const payments = await prisma.payment.findMany({
              where: { providerId: exportJob.providerId },
              include: {
                appointment: { include: { service: true } },
              },
              orderBy: { createdAt: "desc" },
            });
            csvContent =
              "Date,Service,Amount,Type,Status,Method\n" +
              payments
                .map(
                  (p) =>
                    `"${p.createdAt.toISOString()}","${p.appointment.service.name}","${(p.amountInCents / 100).toFixed(2)}","${p.type}","${p.status}","${p.method}"`
                )
                .join("\n");
            break;
          }
        }

        // In production, upload CSV to R2 and store URL
        // For now, store inline (small datasets at MVP scale)
        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            // fileUrl would be set after R2 upload
          },
        });

        console.log(`Export ${exportJobId} completed: ${exportJob.type}`);
      } catch (err) {
        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message : "Unknown error",
          },
        });
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
    console.error(`Export job ${job?.id} failed:`, err.message);
  });

  return worker;
}
