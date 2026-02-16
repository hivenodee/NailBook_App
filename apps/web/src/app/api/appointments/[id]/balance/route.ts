import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBalanceInfo } from "@/lib/balance";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/appointments/:id/balance — public, no auth
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      clientName: true,
      service: { select: { name: true } },
      provider: { select: { businessName: true, slug: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const balance = await getBalanceInfo(id);
  if (!balance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...balance,
      service: { name: appointment.service.name },
      provider: {
        businessName: appointment.provider.businessName,
        slug: appointment.provider.slug,
      },
      clientName: appointment.clientName,
    },
  });
}
