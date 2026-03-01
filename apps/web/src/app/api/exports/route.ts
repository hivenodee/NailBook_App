import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, withErrorHandler } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// POST /api/exports — generate CSV export synchronously
export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const body = await request.json();
  const { type, startDate, endDate } = body as {
    type: string;
    startDate?: string;
    endDate?: string;
  };

  if (!["CLIENTS", "APPOINTMENTS", "TRANSACTIONS"].includes(type)) {
    return error("Invalid export type");
  }

  const parsedStart = startDate ? new Date(startDate) : undefined;
  const parsedEnd = endDate ? new Date(endDate) : undefined;

  const job = await prisma.exportJob.create({
    data: {
      providerId: user.provider.id,
      type: type as "CLIENTS" | "APPOINTMENTS" | "TRANSACTIONS",
      status: "PROCESSING",
      startDate: parsedStart,
      endDate: parsedEnd,
    },
  });

  try {
    let csvContent = "";

    switch (type) {
      case "CLIENTS": {
        const clientDateFilter =
          parsedStart || parsedEnd
            ? {
                createdAt: {
                  ...(parsedStart ? { gte: parsedStart } : {}),
                  ...(parsedEnd ? { lte: parsedEnd } : {}),
                },
              }
            : {};
        const clients = await prisma.providerClient.findMany({
          where: {
            providerId: user.provider.id,
            ...clientDateFilter,
          },
          include: {
            appointments: {
              select: { startTime: true },
              orderBy: { startTime: "asc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "asc" },
        });
        csvContent =
          "Name,Email,Phone,First Visit\n" +
          clients
            .map(
              (c) =>
                `"${escapeCsv(c.name || "")}","${escapeCsv(c.email)}","${escapeCsv(c.phone || "")}","${c.appointments[0]?.startTime.toISOString() || c.createdAt.toISOString()}"`
            )
            .join("\n");
        break;
      }

      case "APPOINTMENTS": {
        const dateFilter =
          parsedStart || parsedEnd
            ? {
                startTime: {
                  ...(parsedStart ? { gte: parsedStart } : {}),
                  ...(parsedEnd ? { lte: parsedEnd } : {}),
                },
              }
            : {};
        const appts = await prisma.appointment.findMany({
          where: { providerId: user.provider.id, ...dateFilter },
          include: { service: true, client: true },
          orderBy: { startTime: "desc" },
        });
        csvContent =
          "Date,Service,Client,Status,Total\n" +
          appts
            .map(
              (a) =>
                `"${a.startTime.toISOString()}","${escapeCsv(a.service.name)}","${escapeCsv(a.client.firstName || a.clientName || "")}","${a.status}","${(a.totalInCents / 100).toFixed(2)}"`
            )
            .join("\n");
        break;
      }

      case "TRANSACTIONS": {
        const dateFilter =
          parsedStart || parsedEnd
            ? {
                createdAt: {
                  ...(parsedStart ? { gte: parsedStart } : {}),
                  ...(parsedEnd ? { lte: parsedEnd } : {}),
                },
              }
            : {};
        const payments = await prisma.payment.findMany({
          where: { providerId: user.provider.id, ...dateFilter },
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
                `"${p.createdAt.toISOString()}","${escapeCsv(p.appointment.service.name)}","${(p.amountInCents / 100).toFixed(2)}","${p.type}","${p.status}","${p.method}"`
            )
            .join("\n");
        break;
      }
    }

    const updatedJob = await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        content: csvContent,
        completedAt: new Date(),
      },
    });

    return success(updatedJob, 201);
  } catch (err) {
    const updatedJob = await prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return success(updatedJob, 201);
  }
});

// GET /api/exports — list export jobs
export const GET = withErrorHandler(async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const jobs = await prisma.exportJob.findMany({
    where: { providerId: user.provider.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return success(jobs);
});

function escapeCsv(val: string): string {
  return val.replace(/"/g, '""');
}
