import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, withErrorHandler } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET /api/clients — list provider's clients with appointment stats
export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) return error("Not a provider", 403);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase();

  const clients = await prisma.providerClient.findMany({
    where: {
      providerId: user.provider.id,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      appointments: {
        select: { id: true, startTime: true, status: true },
        orderBy: { startTime: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    appointmentCount: c.appointments.length,
    lastAppointmentDate: c.appointments[0]?.startTime ?? null,
    createdAt: c.createdAt,
  }));

  return success(result);
});
