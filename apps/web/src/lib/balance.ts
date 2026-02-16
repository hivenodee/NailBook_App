import { prisma } from "@/lib/db";

export type BalanceInfo = {
  totalInCents: number;
  depositInCents: number;
  balancePaidInCents: number;
  remainingInCents: number;
  isPaid: boolean;
};

export async function getBalanceInfo(
  appointmentId: string,
): Promise<BalanceInfo | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      totalInCents: true,
      depositInCents: true,
      payments: {
        where: { type: "BALANCE", status: "COMPLETED" },
        select: { amountInCents: true },
      },
    },
  });

  if (!appointment) return null;

  const balancePaidInCents = appointment.payments.reduce(
    (sum, p) => sum + p.amountInCents,
    0,
  );
  const remainingInCents =
    appointment.totalInCents -
    appointment.depositInCents -
    balancePaidInCents;

  return {
    totalInCents: appointment.totalInCents,
    depositInCents: appointment.depositInCents,
    balancePaidInCents,
    remainingInCents: Math.max(0, remainingInCents),
    isPaid: remainingInCents <= 0,
  };
}
